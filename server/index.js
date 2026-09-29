import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
import { Resend } from 'resend';
import admin from 'firebase-admin';

// Load environment variables
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
}
dotenv.config();

// Initialize Firebase Admin for local server
const serviceAccountPath = 'montapulse-app-firebase-adminsdk-fbsvc-d87cd4f957.json';
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Server] Firebase Admin initialized with service account.');
} else {
    admin.initializeApp();
    console.log('[Server] Firebase Admin initialized with default credentials.');
}
const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3010;

// Middlewares
app.use(cors());
app.use(express.json());

// =========================================================================
// SEGURIDAD Y CONTROL DE ENDPOINTS - FASE 1 (Servidor Local Express)
// =========================================================================

const CONTROLLED_PLANS = {
    'Pro': { name: 'Plan Pulse Pro', price: 5.00, currency: 'USD' },
    'Elite': { name: 'Plan Pulse Elite', price: 10.00, currency: 'USD' }
};
const MENU_ADDON_PRICE = 5.00;

// Rate limiting per User UID / IP
const rateLimitMap = new Map();
function checkRateLimit(key, maxRequests, windowMs) {
    const now = Date.now();
    let entry = rateLimitMap.get(key);
    if (!entry || now - entry.startTime > windowMs) {
        entry = { startTime: now, count: 1 };
        rateLimitMap.set(key, entry);
        return true;
    }
    if (entry.count >= maxRequests) {
        return false;
    }
    entry.count++;
    return true;
}

function rateLimitMiddleware(prefix, maxRequests, windowMs) {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip || 'unknown';
        const key = `${prefix}:${req.user?.uid || ip}`;
        if (!checkRateLimit(key, maxRequests, windowMs)) {
            return res.status(429).json({ 
                success: false, 
                message: 'Límite de peticiones excedido. Por favor intenta más tarde.' 
            });
        }
        next();
    };
}

// Firebase ID Token Verification Middleware
async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado: Se requiere token de autenticación Bearer.' 
        });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (authErr) {
        console.warn('[Auth Middleware] Token inválido o expirado:', authErr.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Token de autenticación expirado o inválido.' 
        });
    }
}

// App Check verification middleware
async function optionalAppCheck(req, res, next) {
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (appCheckToken) {
        try {
            await admin.appCheck().verifyToken(appCheckToken);
        } catch (err) {
            console.warn('[App Check] App Check verification failed:', err.message);
            if (process.env.ENFORCE_APP_CHECK === 'true') {
                return res.status(401).json({ success: false, message: 'App Check verification failed.' });
            }
        }
    }
    next();
}

// Dominios permitidos para redirecciones y callbacks de checkout
const ALLOWED_ORIGINS = [
    'https://www.ubicame.info',
    'https://ubicame.info',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
];

function getSafeOrigin(req) {
    const originHeader = req.get('origin');
    if (originHeader && ALLOWED_ORIGINS.includes(originHeader)) {
        return originHeader;
    }
    return 'https://www.ubicame.info';
}

// Helper para verificar autenticidad del webhook de dLocal Go
function verifyWebhookSignature(req) {
    const expectedSecret = process.env.DLOCAL_WEBHOOK_SECRET;
    if (!expectedSecret) {
        console.error('[Webhook dLocal] DLOCAL_WEBHOOK_SECRET no configurado en el servidor.');
        return false;
    }
    const authHeader = req.headers['authorization'] || req.headers['x-signature'] || req.headers['x-webhook-secret'];
    if (!authHeader) return false;
    
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7).trim() 
        : String(authHeader).trim();

    try {
        const tokenBuf = Buffer.from(token);
        const expectedBuf = Buffer.from(expectedSecret);
        if (tokenBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(tokenBuf, expectedBuf);
    } catch (e) {
        return false;
    }
}

// Middleware para verificar permisos de Administrador
async function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'No autenticado.' });
    }
    if (req.user.admin === true) {
        return next();
    }
    try {
        const userDoc = await db.collection('users_v2').doc(req.user.uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'admin') {
            return next();
        }
    } catch (e) {
        console.warn('[Admin Check] Error verifying admin role:', e.message);
    }
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requieren permisos de administrador.' });
}

/**
 * Route: Create Checkout
 * Description: Validates auth, calculates canonical pricing server-side, creates internal payment order, and calls dLocal Go.
 */
app.post('/api/create-checkout', authenticateUser, optionalAppCheck, rateLimitMiddleware('checkout', 10, 60000), async (req, res) => {
    try {
        const { planId, businessId } = req.body;
        const origin = getSafeOrigin(req);
        const userId = req.user.uid;
        const userEmail = req.user.email || '';

        const controlledPlan = CONTROLLED_PLANS[planId];
        if (!controlledPlan) {
            return res.status(400).json({ 
                success: false, 
                message: `Plan no válido o no disponible para compra directa: ${planId}` 
            });
        }

        // Validar propiedad del negocio si aplica
        if (businessId) {
            const bizDoc = await db.collection('businesses').doc(businessId).get();
            if (!bizDoc.exists) {
                return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
            }
            const bizData = bizDoc.data();
            if (bizData.ownerId !== userId && req.user.admin !== true) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permisos de propietario sobre este negocio.' 
                });
            }
        }

        // Crear orden interna en servidor vinculada al usuario y negocio
        const orderRef = db.collection('payment_orders').doc();
        const orderId = orderRef.id;

        await orderRef.set({
            orderId,
            userId,
            userEmail,
            businessId: businessId || null,
            type: 'subscription',
            planId,
            amount: controlledPlan.price,
            currency: controlledPlan.currency,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Llamar a la pasarela dLocal Go
        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';
        const apiKey = process.env.DLOCAL_GO_API_KEY;
        const secretKey = process.env.DLOCAL_GO_SECRET_KEY;

        if (!apiKey || !secretKey) {
            console.error('[dLocal Go] Credenciales de API no configuradas en el servidor.');
            return res.status(500).json({ 
                success: false, 
                message: 'Servicio de pagos temporalmente no disponible.' 
            });
        }

        const response = await axios.post(DLOCAL_GO_URL, {
            amount: controlledPlan.price,
            currency: controlledPlan.currency,
            country: 'EC',
            description: `${controlledPlan.name} - ${userEmail || userId}`,
            success_url: `${origin}/plans?status=success&orderId=${orderId}`,
            back_url: `${origin}/plans`,
            notification_url: `${origin}/api/webhook/dlocal?orderId=${orderId}`
        }, {
            auth: {
                username: apiKey,
                password: secretKey
            },
            timeout: 10000
        });

        if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
            const checkoutUrl = response.data.checkout_url || response.data.redirect_url;
            return res.json({
                success: true,
                orderId,
                checkout_url: checkoutUrl
            });
        }

        throw new Error('Respuesta de pasarela incompleta');
    } catch (err) {
        console.error('[dLocal Go] Error al procesar checkout:', err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: 'Error al comunicarse con la pasarela de pagos.'
        });
    }
});

/**
 * Route: Create Menu Addon Checkout Session ($5 USD/month)
 */
app.post('/api/menu-addon/checkout', authenticateUser, optionalAppCheck, rateLimitMiddleware('menu_addon', 10, 60000), async (req, res) => {
    try {
        const { businessId } = req.body;
        const origin = getSafeOrigin(req);
        const userId = req.user.uid;
        const userEmail = req.user.email || '';

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'businessId es requerido.' });
        }

        const bizDoc = await db.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
        const bizData = bizDoc.data();
        if (bizData.ownerId !== userId && req.user.admin !== true) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos de propietario sobre este negocio.' 
            });
        }

        const orderRef = db.collection('payment_orders').doc();
        const orderId = orderRef.id;

        await orderRef.set({
            orderId,
            userId,
            userEmail,
            businessId,
            type: 'menu_addon',
            amount: MENU_ADDON_PRICE,
            currency: 'USD',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';
        const apiKey = process.env.DLOCAL_GO_API_KEY;
        const secretKey = process.env.DLOCAL_GO_SECRET_KEY;

        if (!apiKey || !secretKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'Servicio de pagos temporalmente no disponible.' 
            });
        }

        const response = await axios.post(DLOCAL_GO_URL, {
            amount: MENU_ADDON_PRICE,
            currency: 'USD',
            country: 'EC',
            description: 'Activar Menú Digital QR - ubicame.info',
            success_url: `${origin}/passport?menu_addon_status=success&orderId=${orderId}`,
            back_url: `${origin}/passport`,
            notification_url: `${origin}/api/webhook/dlocal?orderId=${orderId}`
        }, {
            auth: {
                username: apiKey,
                password: secretKey
            },
            timeout: 10000
        });

        if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
            return res.json({
                success: true,
                orderId,
                checkout_url: response.data.checkout_url || response.data.redirect_url
            });
        }

        throw new Error('Respuesta de pasarela incompleta');
    } catch (err) {
        console.error('[Menu Addon] Error:', err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: 'Error al comunicarse con la pasarela de pagos.'
        });
    }
});

/**
 * Route: Atomic RSVP toggle
 */
app.post('/api/events/:eventId/rsvp', authenticateUser, optionalAppCheck, rateLimitMiddleware('rsvp', 30, 60000), async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.uid;

        if (!eventId) {
            return res.status(400).json({ success: false, message: 'eventId es requerido.' });
        }

        const eventRef = db.collection('events').doc(eventId);
        const rsvpDocId = `${eventId}_${userId}`;
        const rsvpRef = db.collection('rsvps').doc(rsvpDocId);

        const result = await db.runTransaction(async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists) {
                throw new Error('EVENT_NOT_FOUND');
            }

            const eventData = eventSnap.data();
            const currentCount = eventData.interestedCount || 0;

            const rsvpSnap = await transaction.get(rsvpRef);

            if (rsvpSnap.exists) {
                transaction.delete(rsvpRef);
                const newCount = Math.max(0, currentCount - 1);
                transaction.update(eventRef, {
                    interestedCount: newCount
                });
                return { rsvp: false, interestedCount: newCount };
            } else {
                transaction.set(rsvpRef, {
                    userId,
                    eventId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                const newCount = currentCount + 1;
                transaction.update(eventRef, {
                    interestedCount: newCount
                });
                return { rsvp: true, interestedCount: newCount };
            }
        });

        return res.json({
            success: true,
            rsvp: result.rsvp,
            interestedCount: result.interestedCount
        });
    } catch (err) {
        if (err.message === 'EVENT_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
        }
        console.error('[RSVP API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error procesando RSVP.' });
    }
});

/**
 * Helper & Routes: Secure Coupon Redemption
 */
async function handleRedeemCoupon(req, res) {
    try {
        const couponIdParam = req.params?.couponId;
        const { reservationCode, businessId } = req.body;
        const hostUid = req.user.uid;

        if (!reservationCode || typeof reservationCode !== 'string') {
            return res.status(400).json({ success: false, message: 'reservationCode es requerido.' });
        }

        const cleanCode = reservationCode.trim().toUpperCase();

        let q = db.collection('couponRedemptions')
            .where('reservationCode', '==', cleanCode)
            .where('status', '==', 'reserved');

        if (businessId) {
            q = q.where('businessId', '==', businessId);
        }

        const snap = await q.get();
        if (snap.empty) {
            return res.status(404).json({ 
                success: false, 
                message: 'Código inválido, ya usado o no pertenece a este negocio.' 
            });
        }

        const redemptionDoc = snap.docs[0];
        const redemptionData = redemptionDoc.data();
        const targetCouponId = couponIdParam || redemptionData.couponId;

        // Verificar expiración
        const now = new Date();
        const expiresAt = redemptionData.expiresAt ? (redemptionData.expiresAt.toDate ? redemptionData.expiresAt.toDate() : new Date(redemptionData.expiresAt)) : null;
        if (expiresAt && expiresAt < now) {
            await redemptionDoc.ref.update({ status: 'expired' });
            return res.status(400).json({ success: false, message: 'Este cupón ha expirado.' });
        }

        // Validar autorización del negocio: el usuario autenticado debe ser dueño del negocio o admin
        const bizDoc = await db.collection('businesses').doc(redemptionData.businessId).get();
        if (!bizDoc.exists) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
        const bizData = bizDoc.data();
        const isOwner = (bizData.ownerId === hostUid);
        const isAdminClaim = (req.user.admin === true);

        if (!isOwner && !isAdminClaim) {
            const userDoc = await db.collection('users_v2').doc(hostUid).get();
            const isAdminRole = userDoc.exists && userDoc.data()?.role === 'admin';
            if (!isAdminRole) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No estás autorizado para validar cupones de este negocio.' 
                });
            }
        }

        // Transacción atómica: Incrementar currentUses y marcar redeemed
        const couponRef = db.collection('coupons').doc(targetCouponId);
        const result = await db.runTransaction(async (transaction) => {
            const couponSnap = await transaction.get(couponRef);
            if (!couponSnap.exists) {
                throw new Error('COUPON_NOT_FOUND');
            }
            const couponData = couponSnap.data();
            if (couponData.maxUses > 0 && (couponData.currentUses || 0) >= couponData.maxUses) {
                throw new Error('COUPON_EXHAUSTED');
            }

            const currentRedemptionSnap = await transaction.get(redemptionDoc.ref);
            if (currentRedemptionSnap.data().status !== 'reserved') {
                throw new Error('ALREADY_REDEEMED');
            }

            transaction.update(couponRef, {
                currentUses: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            transaction.update(redemptionDoc.ref, {
                status: 'redeemed',
                redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
                validatedBy: hostUid
            });

            return {
                couponData: { ...couponData, currentUses: (couponData.currentUses || 0) + 1 },
                redemptionData: { ...redemptionData, status: 'redeemed', validatedBy: hostUid }
            };
        });

        return res.json({
            success: true,
            redemptionData: result.redemptionData,
            couponData: result.couponData
        });
    } catch (err) {
        if (err.message === 'COUPON_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Cupón no encontrado.' });
        }
        if (err.message === 'COUPON_EXHAUSTED') {
            return res.status(400).json({ success: false, message: 'Este cupón ha alcanzado su límite de usos.' });
        }
        if (err.message === 'ALREADY_REDEEMED') {
            return res.status(400).json({ success: false, message: 'Este código ya ha sido canjeado.' });
        }
        console.error('[Coupon Redeem API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error al canjear cupón.' });
    }
}

app.post('/api/coupons/:couponId/redeem', authenticateUser, optionalAppCheck, rateLimitMiddleware('coupon_redeem', 20, 60000), handleRedeemCoupon);
app.post('/api/coupons/redeem', authenticateUser, optionalAppCheck, rateLimitMiddleware('coupon_redeem', 20, 60000), handleRedeemCoupon);

/**
 * Route: Award Points (Fixed amounts for legitimate actions, rate-limited and audited)
 */
app.post('/api/points/award', authenticateUser, optionalAppCheck, rateLimitMiddleware('points_award', 30, 60000), async (req, res) => {
    try {
        const { action, targetId } = req.body;
        const callerUid = req.user.uid;

        if (!action || !targetId) {
            return res.status(400).json({ success: false, message: 'action y targetId requeridos.' });
        }

        if (action === 'like_post') {
            const postDoc = await db.collection('posts').doc(targetId).get();
            if (!postDoc.exists) {
                return res.status(404).json({ success: false, message: 'Post no encontrado.' });
            }
            const post = postDoc.data();
            const recipientUid = post.authorId;

            if (!recipientUid || recipientUid === callerUid) {
                return res.json({ success: true, awarded: 0, reason: 'self_like' });
            }

            const txId = `like_${targetId}_${callerUid}`;
            const txRef = db.collection('point_transactions').doc(txId);
            const userRef = db.collection('users_v2').doc(recipientUid);

            const awarded = await db.runTransaction(async (t) => {
                const txSnap = await t.get(txRef);
                if (txSnap.exists) {
                    return 0;
                }
                t.set(txRef, {
                    txId,
                    userId: recipientUid,
                    fromUser: callerUid,
                    action: 'like_post',
                    targetId,
                    amount: 2,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                t.set(userRef, {
                    points: admin.firestore.FieldValue.increment(2),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                return 2;
            });

            return res.json({ success: true, awarded });
        } else if (action === 'comment_post') {
            const postDoc = await db.collection('posts').doc(targetId).get();
            if (!postDoc.exists) {
                return res.status(404).json({ success: false, message: 'Post no encontrado.' });
            }

            const txRef = db.collection('point_transactions').doc();
            const userRef = db.collection('users_v2').doc(callerUid);

            await db.runTransaction(async (t) => {
                t.set(txRef, {
                    userId: callerUid,
                    action: 'comment_post',
                    targetId,
                    amount: 2,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                t.set(userRef, {
                    points: admin.firestore.FieldValue.increment(2),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });

            return res.json({ success: true, awarded: 2 });
        } else {
            return res.status(400).json({ success: false, message: 'Acción de puntos no reconocida.' });
        }
    } catch (err) {
        console.error('[Points Award API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error procesando puntos.' });
    }
});

/**
 * Route: Purchase Boost with Points (Server-enforced price of 300 points)
 */
app.post('/api/points/boost', authenticateUser, optionalAppCheck, rateLimitMiddleware('points_boost', 10, 60000), async (req, res) => {
    try {
        const { businessId, durationHours = 24 } = req.body;
        const userId = req.user.uid;
        const BOOST_COST = 300;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'businessId es requerido.' });
        }

        const bizDoc = await db.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
        const bizData = bizDoc.data();
        if (bizData.ownerId !== userId && req.user.admin !== true) {
            return res.status(403).json({ success: false, message: 'No eres el propietario de este negocio.' });
        }

        const userRef = db.collection('users_v2').doc(userId);
        const boostRef = db.collection('boosts').doc();
        const txRef = db.collection('point_transactions').doc();

        await db.runTransaction(async (t) => {
            const userSnap = await t.get(userRef);
            const currentPoints = (userSnap.exists ? userSnap.data().points : 0) || 0;

            if (currentPoints < BOOST_COST) {
                throw new Error('INSUFFICIENT_POINTS');
            }

            const now = Date.now();
            const expiresAt = now + (Number(durationHours) * 60 * 60 * 1000);

            t.update(userRef, {
                points: admin.firestore.FieldValue.increment(-BOOST_COST),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            t.set(boostRef, {
                businessId,
                userId,
                points: BOOST_COST,
                durationHours: Number(durationHours),
                active: true,
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(expiresAt)
            });

            t.set(txRef, {
                userId,
                businessId,
                action: 'purchase_boost',
                amount: -BOOST_COST,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return res.json({ success: true, message: 'Boost activado con éxito.' });
    } catch (err) {
        if (err.message === 'INSUFFICIENT_POINTS') {
            return res.status(400).json({ success: false, message: 'Puntos insuficientes para activar el boost.' });
        }
        console.error('[Points Boost API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error al procesar el boost.' });
    }
});

/**
 * Route: Admin Points Adjustment
 */
app.post('/api/admin/points', authenticateUser, requireAdmin, optionalAppCheck, async (req, res) => {
    try {
        const { targetUserId, amount, reason } = req.body;
        const adminId = req.user.uid;

        if (!targetUserId || typeof amount !== 'number' || isNaN(amount)) {
            return res.status(400).json({ success: false, message: 'targetUserId y amount numérico requeridos.' });
        }

        const userRef = db.collection('users_v2').doc(targetUserId);
        const txRef = db.collection('point_transactions').doc();

        await db.runTransaction(async (t) => {
            const userSnap = await t.get(userRef);
            if (!userSnap.exists) {
                throw new Error('USER_NOT_FOUND');
            }

            t.set(userRef, {
                points: admin.firestore.FieldValue.increment(amount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            t.set(txRef, {
                userId: targetUserId,
                adminId,
                action: 'admin_adjustment',
                amount,
                reason: String(reason || 'Ajuste manual de administrador').slice(0, 500),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return res.json({ success: true, message: 'Puntos actualizados con éxito.' });
    } catch (err) {
        if (err.message === 'USER_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        console.error('[Admin Points API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error ajustando puntos.' });
    }
});

/**
 * Route: Admin Toggle Pulse Pass
 */
app.post('/api/pulse-pass/toggle', authenticateUser, requireAdmin, optionalAppCheck, async (req, res) => {
    try {
        const { targetUserId, active } = req.body;
        if (!targetUserId || typeof active !== 'boolean') {
            return res.status(400).json({ success: false, message: 'targetUserId y active (booleano) requeridos.' });
        }

        const userRef = db.collection('users_v2').doc(targetUserId);
        await userRef.set({
            pulsePassActive: active,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.json({ success: true });
    } catch (err) {
        console.error('[Toggle PulsePass API] Error:', err);
        return res.status(500).json({ success: false, message: 'Error actualizando Pulse Pass.' });
    }
});

/**
 * Route: AI Proxy for OpenRouter
 */
app.post('/api/ai/openrouter', authenticateUser, optionalAppCheck, rateLimitMiddleware('ai_openrouter', 30, 60000), async (req, res) => {
    try {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({ success: false, message: 'Servicio de IA no configurado en el servidor.' });
        }

        const { messages, model, jsonMode, stream } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, message: 'Parámetro messages inválido.' });
        }

        // Sanitización y límite razonable de longitud
        const safeMessages = messages.slice(-10).map(m => ({
            role: m.role === 'system' ? 'system' : (m.role === 'assistant' ? 'assistant' : 'user'),
            content: String(m.content || '').slice(0, 4000)
        }));

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: model || 'google/gemini-2.5-flash',
            messages: safeMessages,
            max_tokens: 1024,
            temperature: 0.7,
            stream: stream || false,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://www.ubicame.info',
                'X-Title': 'MontaPulse Local',
            },
            responseType: stream ? 'stream' : 'json',
            timeout: 25000
        });

        if (stream) {
            response.data.pipe(res);
        } else {
            res.json(response.data);
        }
    } catch (err) {
        console.error('[AI Proxy] OpenRouter Error:', err.message);
        res.status(500).json({ success: false, message: 'No se pudo procesar la solicitud con IA.' });
    }
});

/**
 * Route: AI Proxy for Gemini
 */
app.post('/api/ai/gemini', authenticateUser, optionalAppCheck, rateLimitMiddleware('ai_gemini', 30, 60000), async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ success: false, message: 'Servicio de IA no configurado en el servidor.' });
        }

        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ success: false, message: 'Prompt requerido.' });
        }

        const safePrompt = prompt.slice(0, 4000);

        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: safePrompt }] }]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 25000
        });

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ text });
    } catch (err) {
        console.error('[AI Proxy] Gemini Error:', err.message);
        res.status(500).json({ success: false, message: 'No se pudo procesar la solicitud con IA.' });
    }
});

/**
 * Route: Send Email with Resend (Hardened: Admin Only & Server-Controlled Sender)
 */
app.post('/api/send-email', authenticateUser, requireAdmin, optionalAppCheck, rateLimitMiddleware('send_email', 10, 600000), async (req, res) => {
    const { to, subject, html, text } = req.body;

    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('[Resend] RESEND_API_KEY no configurado.');
            return res.status(500).json({ success: false, message: 'Servicio de correo no configurado.' });
        }

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos: to, subject, y html o text.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to) || to.length > 100) {
            return res.status(400).json({ success: false, message: 'Dirección de correo no válida.' });
        }

        const resendInstance = new Resend(apiKey);
        const serverFrom = process.env.RESEND_FROM_EMAIL || 'MontaPulse <onboarding@resend.dev>';

        const data = await resendInstance.emails.send({
            from: serverFrom,
            to,
            subject: String(subject).slice(0, 200),
            html: html ? String(html).slice(0, 50000) : text,
            text: text ? String(text).slice(0, 50000) : html
        });

        if (data.error) {
            console.error('[Resend] Error devuelto por la API:', data.error);
            return res.status(400).json({ success: false, message: 'Error al enviar el correo.' });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('[Resend] Error crítico:', error.message);
        return res.status(500).json({ success: false, message: 'Error interno al enviar correo.' });
    }
});

/**
 * Route: Register Business Visit (Anti-spam / Bot Filtering / Unique IPs)
 */
app.post('/api/business/visit', rateLimitMiddleware('visit', 60, 60000), async (req, res) => {
    const { businessId } = req.body;
    let userIp = req.body.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    if (!businessId) {
        return res.status(400).json({ success: false, message: 'Falta businessId en el cuerpo.' });
    }

    try {
        if (typeof userIp === 'string') {
            userIp = userIp.split(',')[0].trim();
        } else {
            userIp = 'unknown';
        }

        const userAgent = req.headers['user-agent'] || '';
        const isBot = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|headless/i.test(userAgent);
        if (isBot) {
            console.log(`[Visit API] Ignored bot request for business: ${businessId}`);
            return res.json({ success: true, incremented: false, message: 'Bots are not counted.' });
        }

        const sanitizedIp = userIp.replace(/[^a-zA-Z0-9]/g, '_');
        const docId = `${businessId}_${sanitizedIp}`;
        const visitRef = db.collection('registro_visitas').doc(docId);
        
        const visitSnap = await visitRef.get();
        const now = new Date();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (visitSnap.exists) {
            const data = visitSnap.data();
            const lastVisit = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date(0);
            if (now.getTime() - lastVisit.getTime() < TWENTY_FOUR_HOURS) {
                return res.json({ success: true, incremented: false, message: 'Visita ya registrada en las últimas 24 horas.' });
            }
        }

        await visitRef.set({
            businessId,
            ip: userIp,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        const bizRef = db.collection('businesses').doc(businessId);
        const bizSnap = await bizRef.get();

        if (bizSnap.exists) {
            const data = bizSnap.data();
            let shouldReset = false;

            if (data.lastMonthlyResetDate) {
                const lastReset = data.lastMonthlyResetDate.toDate ? data.lastMonthlyResetDate.toDate() : new Date(data.lastMonthlyResetDate);
                if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                    shouldReset = true;
                }
            } else {
                shouldReset = true;
            }

            const updateData = {
                viewCount: admin.firestore.FieldValue.increment(1)
            };

            if (shouldReset) {
                updateData.monthlyViews = 1;
                updateData.lastMonthlyResetDate = admin.firestore.FieldValue.serverTimestamp();
            } else {
                updateData.monthlyViews = admin.firestore.FieldValue.increment(1);
            }

            await bizRef.update(updateData);
            return res.json({ success: true, incremented: true });
        } else {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado.' });
        }
    } catch (error) {
        console.error('[Visit API] Error registering visit:', error);
        return res.status(500).json({ success: false, message: 'Error registrando visita.' });
    }
});

/**
 * Route: dLocal Go Webhook
 * Verified via signature secret, linked to internal order, and idempotent.
 */
app.post('/api/webhook/dlocal', async (req, res) => {
    try {
        if (!verifyWebhookSignature(req)) {
            console.warn('[Webhook dLocal] Intento de acceso con firma o token inválido.');
            return res.status(401).json({ success: false, message: 'Firma de Webhook no válida.' });
        }

        const { status } = req.body;
        const orderId = req.query.orderId || req.body.orderId || req.body.order_id;

        if (!orderId) {
            console.warn('[Webhook dLocal] Petición webhook recibida sin orderId.');
            return res.status(400).json({ success: false, message: 'Falta orderId.' });
        }

        const orderRef = db.collection('payment_orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.warn(`[Webhook dLocal] Orden no encontrada: ${orderId}`);
            return res.status(404).json({ success: false, message: 'Orden de pago no encontrada.' });
        }

        const orderData = orderSnap.data();

        // IDEMPOTENCIA: Si la orden ya fue procesada exitosamente como PAID, responder 200 sin reprocesar
        if (orderData.status === 'PAID') {
            console.log(`[Webhook dLocal] Orden ${orderId} ya fue procesada previamente (Idempotencia).`);
            return res.status(200).send('OK');
        }

        if (status === 'PAID') {
            const batch = db.batch();
            const now = new Date();
            const expires = new Date();
            expires.setDate(now.getDate() + 30);

            // 1. Actualizar orden interna
            batch.update(orderRef, {
                status: 'PAID',
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                dlocalPayload: req.body
            });

            // 2. Si es suscripción de usuario
            if (orderData.type === 'subscription' && orderData.userId && orderData.planId) {
                const userRef = db.collection('users_v2').doc(orderData.userId);
                batch.set(userRef, {
                    plan: orderData.planId,
                    pulsePassActive: true,
                    subscriptionEndDate: expires.getTime(),
                    paymentStatus: 'active',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Si está asociado a un negocio, actualizar el plan del negocio
                if (orderData.businessId) {
                    const bizRef = db.collection('businesses').doc(orderData.businessId);
                    batch.set(bizRef, {
                        plan: orderData.planId,
                        paymentStatus: 'active',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                // Recompensa por referido (idempotente: solo si no fue otorgada antes)
                if (orderData.businessId && !orderData.referralRewardGranted) {
                    const bizDoc = await db.collection('businesses').doc(orderData.businessId).get();
                    if (bizDoc.exists && bizDoc.data()?.referredBy) {
                        const referrerId = bizDoc.data().referredBy;
                        const refBizDoc = await db.collection('businesses').doc(referrerId).get();
                        if (refBizDoc.exists) {
                            batch.update(refBizDoc.ref, {
                                eventCredits: admin.firestore.FieldValue.increment(50)
                            });
                        }
                    }
                    batch.update(orderRef, { referralRewardGranted: true });
                }
            } else if (orderData.type === 'menu_addon' && orderData.businessId) {
                // 3. Si es Menu Addon
                const bizRef = db.collection('businesses').doc(orderData.businessId);
                batch.set(bizRef, {
                    menu_premium_active: true,
                    menu_subscription: {
                        status: 'active',
                        payment_method: 'dlocal',
                        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiresAt: admin.firestore.Timestamp.fromDate(expires),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }
                }, { merge: true });
            }

            // 4. Registro contable en transacciones
            const txRef = db.collection('transactions').doc();
            batch.set(txRef, {
                orderId,
                userId: orderData.userId,
                planId: orderData.planId || 'menu_addon',
                type: orderData.type,
                amount: orderData.amount,
                currency: orderData.currency,
                status: 'PAID',
                gateway: 'dLocal',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            console.log(`[Webhook dLocal] Orden ${orderId} procesada y plan activado exitosamente.`);
        } else {
            await orderRef.update({
                status: status || 'failed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('[Webhook dLocal] Error:', error);
        return res.status(500).send('Error');
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor de pagos activo en http://localhost:${PORT}`);
    console.log(`   - Si falla, revisa el archivo 'dlocal_error.log'\n`);
});
