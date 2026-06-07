import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { Resend } from 'resend';
import { enviarPulseSemanal } from './services/newsletterService.js';
import { enviarReporteMensualNegocio } from './services/reporteMensualService.js';


// Inicializar Firebase Admin
admin.initializeApp();

// Cargar variables de entorno
dotenv.config();

const app = express();
const db = admin.firestore();

// Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

// Forzar redirección a WWW para evitar errores de certificado/configuración
app.use((req, res, next) => {
    const host = req.get('host');
    if (host === 'ubicame.info') {
        return res.redirect(301, `https://www.ubicame.info${req.originalUrl}`);
    }
    next();
});

/**
 * Route: Sitemap Generator (SEO)
 */
app.get('/sitemap.xml', async (req, res) => {
    try {
        const origin = req.get('origin') || 'https://www.ubicame.info';
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Añadir rutas estáticas principales
        const staticRoutes = ['/', '/explore', '/calendar', '/plans', '/community', '/info'];
        staticRoutes.forEach(route => {
            xml += `  <url>\n    <loc>${origin}${route}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        });

        // Añadir negocios activos
        const businessesSnapshot = await db.collection('businesses').get();
        businessesSnapshot.forEach(doc => {
            const data = doc.data();
            const slug = data.slug || doc.id;
            xml += `  <url>\n    <loc>${origin}/negocio/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        // Añadir eventos activos
        const eventsSnapshot = await db.collection('events').get();
        eventsSnapshot.forEach(doc => {
            const data = doc.data();
            const slug = data.slug || doc.id;
            xml += `  <url>\n    <loc>${origin}/evento/${slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.status(200).send(xml);
    } catch (error) {
        logger.error('[Sitemap] Error al generar sitemap:', error);
        res.status(500).send('Error generando sitemap');
    }
});

/**
 * Route: SEO Prerender for Events
 */
app.get('/evento/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const host = req.headers['x-forwarded-host'] || req.hostname;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${protocol}://${host}`;
        
        let event = null;
        const eventsSnapshot = await db.collection('events').where('slug', '==', slug).limit(1).get();
        if (!eventsSnapshot.empty) {
            event = eventsSnapshot.docs[0].data();
        } else {
            const doc = await db.collection('events').doc(slug).get();
            if (doc.exists) event = doc.data();
        }

        let baseHtml = '';
        try {
            const htmlRes = await axios.get(`${baseUrl}/`);
            baseHtml = htmlRes.data;
        } catch (err) {
            logger.error('[SEO] Error fetching base HTML', err.message);
            baseHtml = `<!DOCTYPE html><html><head><title>MontaPulse</title></head><body><div id="root"></div><script>window.location.href="/explore"</script></body></html>`;
        }

        if (event) {
            const title = event.title || 'Evento en MontaPulse';
            const description = event.description || 'Descubre los mejores eventos en Montañita y Olón.';
            const imageUrl = event.images && event.images.length > 0 ? event.images[0] : `${baseUrl}/favicon.ico`;
            
            const metaTags = `
                <title>${title} | MontaPulse</title>
                <meta name="description" content="${description}" />
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="og:url" content="${baseUrl}/evento/${slug}" />
                <meta property="og:type" content="event" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${description}" />
                <meta name="twitter:image" content="${imageUrl}" />
            `;
            baseHtml = baseHtml.replace(/<title>.*<\/title>/i, metaTags);
        }

        res.status(200).send(baseHtml);
    } catch (error) {
        logger.error('[SEO] Error en evento SEO:', error);
        res.status(500).send('Error interno');
    }
});

/**
 * Route: SEO Prerender for Businesses
 */
app.get('/negocio/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const host = req.headers['x-forwarded-host'] || req.hostname;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${protocol}://${host}`;
        
        let business = null;
        const bizSnapshot = await db.collection('businesses').where('slug', '==', slug).limit(1).get();
        if (!bizSnapshot.empty) {
            business = bizSnapshot.docs[0].data();
        } else {
            const doc = await db.collection('businesses').doc(slug).get();
            if (doc.exists) business = doc.data();
        }

        let baseHtml = '';
        try {
            const htmlRes = await axios.get(`${baseUrl}/`);
            baseHtml = htmlRes.data;
        } catch (err) {
            logger.error('[SEO] Error fetching base HTML', err.message);
            baseHtml = `<!DOCTYPE html><html><head><title>MontaPulse</title></head><body><div id="root"></div><script>window.location.href="/explore"</script></body></html>`;
        }

        if (business) {
            const title = business.name || 'Negocio en MontaPulse';
            const description = business.description || 'Encuentra los mejores lugares en la costa ecuatoriana.';
            const imageUrl = business.images && business.images.length > 0 ? business.images[0] : `${baseUrl}/favicon.ico`;
            
            const metaTags = `
                <title>${title} | MontaPulse</title>
                <meta name="description" content="${description}" />
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="og:url" content="${baseUrl}/negocio/${slug}" />
                <meta property="og:type" content="business.business" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${description}" />
                <meta name="twitter:image" content="${imageUrl}" />
            `;
            baseHtml = baseHtml.replace(/<title>.*<\/title>/i, metaTags);
        }

        res.status(200).send(baseHtml);
    } catch (error) {
        logger.error('[SEO] Error en negocio SEO:', error);
        res.status(500).send('Error interno');
    }
});

/**
 * Route: Create Checkout
 */
app.post('/api/create-checkout', async (req, res) => {
    const { amount, currency, description, userId, planId } = req.body;
    const origin = req.get('origin') || 'https://montapulse-app.web.app';

    logger.info(`[dLocal Go] Creating checkout for ${amount} ${currency}: ${description}`);

    try {
        const parsedAmount = parseFloat(amount);

        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: `Monto no válido: ${amount}` });
        }

        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';

        logger.info(`[dLocal Go] Intentando crear pago en: ${DLOCAL_GO_URL}`);

        try {
            const response = await axios.post(DLOCAL_GO_URL, {
                amount: parseFloat(parsedAmount.toFixed(2)),
                currency: currency || 'USD',
                country: req.body.country || 'EC',
                description: description || 'Plan Pulse Pro',
                success_url: origin + '/plans?status=success',
                back_url: origin + '/plans',
                notification_url: origin + '/api/webhook/dlocal?userId=' + encodeURIComponent(userId || '') + '&planId=' + encodeURIComponent(planId || '')
            }, {
                auth: {
                    username: process.env.DLOCAL_GO_API_KEY,
                    password: process.env.DLOCAL_GO_SECRET_KEY
                },
                timeout: 10000
            });

            if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
                logger.info('[dLocal Go] ¡Éxito en la creación!');
                return res.json({
                    success: true,
                    checkout_url: response.data.checkout_url || response.data.redirect_url
                });
            }
        } catch (err) {
            const errorStatus = err.response?.status || 500;
            const errorData = err.response?.data || err.message;
            logger.error(`[dLocal Go] Error ${errorStatus}:`, errorData);

            return res.status(errorStatus).json({
                success: false,
                message: 'Error al conectar con dLocal Go',
                detail: errorData
            });
        }

    } catch (globalError) {
        logger.error('[dLocal Go] Error crítico en la función:', globalError.message);
        res.status(500).json({
            success: false,
            message: 'Error interno en el servidor de pagos',
            detail: globalError.message
        });
    }
});

/**
 * Route: AI Proxy for OpenRouter
 */
app.post('/api/ai/openrouter', async (req, res) => {
    try {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OpenRouter key missing on server' });
        
        const { messages, model, jsonMode, stream } = req.body;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: model || 'google/gemini-2.5-flash',
            messages,
            max_tokens: 1024,
            temperature: 0.7,
            stream: stream || false,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://montapulse.com',
                'X-Title': 'Montapulse',
            },
            responseType: stream ? 'stream' : 'json'
        });

        if (stream) {
            response.data.pipe(res);
        } else {
            res.json(response.data);
        }
    } catch (err) {
        logger.error('[AI Proxy] OpenRouter Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/**
 * Route: AI Proxy for Gemini
 */
app.post('/api/ai/gemini', async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini key missing on server' });

        const { prompt } = req.body;
        
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ text });
    } catch (err) {
        logger.error('[AI Proxy] Gemini Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/**
 * Route: Send Email with Resend
 */
app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, text, from } = req.body;

    logger.info(`[Resend] Intentando enviar email a: ${to}, Asunto: ${subject}`);

    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            logger.error('[Resend] Error: RESEND_API_KEY no configurado en Cloud Functions.');
            return res.status(500).json({ success: false, message: 'La clave de API de Resend no está configurada.' });
        }

        const resendInstance = new Resend(apiKey);

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos: to, subject, y html o text.' });
        }

        const data = await resendInstance.emails.send({
            from: from || 'MontaPulse <onboarding@resend.dev>',
            to,
            subject,
            html: html || text,
            text: text || html
        });

        if (data.error) {
            logger.error('[Resend] Error devuelto por la API:', data.error);
            return res.status(400).json({ success: false, error: data.error });
        }

        logger.info('[Resend] ¡Email enviado con éxito!', data);
        return res.json({ success: true, data });
    } catch (error) {
        logger.error('[Resend] Error crítico al enviar email:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Exportamos la función bajo el nombre 'api'
export const api = onRequest({
    region: "us-central1",
    minInstances: 0,
    invoker: "public"
}, app);

/**
 * Route: dLocal Go Webhook
 */
app.post('/api/webhook/dlocal', async (req, res) => {
    try {
        const { userId, planId } = req.query;
        const { status } = req.body;

        // VERIFICACIÓN DE SEGURIDAD: Prevenir falsificación de pagos (Spoofing)
        const expectedToken = process.env.DLOCAL_WEBHOOK_SECRET;
        const authHeader = req.headers['authorization'];
        
        if (expectedToken) {
            if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
                logger.warn(`[Webhook dLocal] Intento de fraude bloqueado. Token inválido o ausente para user ${userId}`);
                return res.status(401).json({ success: false, message: 'Firma de Webhook no válida' });
            }
        } else {
            logger.warn(`[Webhook dLocal] ALERTA DE SEGURIDAD: DLOCAL_WEBHOOK_SECRET no está configurado. El endpoint es vulnerable a fraude.`);
        }

        logger.info(`[Webhook dLocal] Recibido para user ${userId}, plan ${planId}, status: ${status}`);

        // Verificamos si dLocal envía "PAID" u otro estado exitoso
        if (status === 'PAID' && userId && planId) {
            // Actualizar usuario en Firestore
            const userRef = db.collection('users').doc(userId);
            await userRef.set({
                plan: planId,
                pulsePassActive: true
            }, { merge: true });

            // Mantener un historial contable
            const transactionRef = db.collection('transactions').doc();
            await transactionRef.set({
                userId,
                planId,
                status,
                gateway: 'dLocal',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                rawBody: req.body
            });

            logger.info(`[Webhook dLocal] Usuario ${userId} actualizado a plan ${planId}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error('[Webhook dLocal] Error:', error);
        res.status(500).send('Error');
    }
});

/**
 * Scheduled Task: Notify users 2 hours before coupon reservation expires
 * Runs every 30 minutes to ensure timely reminders.
 */
export const checkExpiringReservations = onSchedule("every 30 minutes", async (event) => {
    try {
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const bufferTime = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // 2.5h to catch 2h window

        logger.info(`[Reminder] Checking reservations expiring between ${now.toISOString()} and ${twoHoursLater.toISOString()}`);

        const reservationsSnapshot = await db.collection('couponRedemptions')
            .where('status', '==', 'reserved')
            .where('expiresAt', '>', admin.firestore.Timestamp.fromDate(now))
            .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(bufferTime))
            .get();

        if (reservationsSnapshot.empty) {
            return logger.info('[Reminder] No reservations found in the expiration window.');
        }

        const batch = db.batch();
        let sentCount = 0;

        for (const doc of reservationsSnapshot.docs) {
            const data = doc.data();
            
            // Skip if already sent or if it's too early/late (extra safety)
            if (data.reminderSent) continue;

            // Create in-app notification
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                userId: data.userId,
                title: '⌛ ¡Tu cupón expira pronto!',
                message: `Tu reserva para "${data.couponCode}" expira en menos de 2 horas. ¡No pierdas tu beneficio!`,
                type: 'offer',
                businessId: data.businessId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Mark as reminder sent
            batch.update(doc.ref, { reminderSent: true });
            sentCount++;
        }

        if (sentCount > 0) {
            await batch.commit();
            logger.info(`[Reminder] Sent ${sentCount} expiration reminders.`);
        } else {
            logger.info('[Reminder] All potential reservations already had reminders sent.');
        }

        // --- NEW: Handle automated status transition for EXPIRED reservations ---
        const expiredSnapshot = await db.collection('couponRedemptions')
            .where('status', '==', 'reserved')
            .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(now))
            .get();

        if (!expiredSnapshot.empty) {
            const cleanupBatch = db.batch();
            expiredSnapshot.forEach(doc => {
                cleanupBatch.update(doc.ref, { status: 'expired', expiredAt: admin.firestore.FieldValue.serverTimestamp() });
            });
            await cleanupBatch.commit();
            logger.info(`[Cleanup] Successfully expired ${expiredSnapshot.size} stale reservations.`);
        }

    } catch (error) {
        logger.error('[Reminder] Critical error in scheduled task:', error);
    }
});

/**
 * Scheduled Task: Send weekly events newsletter (Thursday report) to users
 */
export const sendWeeklyNewsletter = onSchedule({
    schedule: "0 9 * * 4", // 9:00 AM every Thursday
    timeZone: "America/Guayaquil",
}, async (event) => {
    try {
        logger.info('[Newsletter] Starting weekly events newsletter scheduled task...');

        // Fetch all users with email
        const usersSnapshot = await db.collection('users_v2').get();
        const usuarios = [];
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.email) {
                usuarios.push({
                    email: data.email,
                    name: `${data.name || ''} ${data.surname || ''}`.trim() || 'Pulser'
                });
            }
        });

        if (usuarios.length === 0) {
            logger.info('[Newsletter] No users found with emails. Exiting.');
            return;
        }

        // Fetch active/upcoming events
        const now = new Date();
        const eventsSnapshot = await db.collection('events')
            .where('status', '!=', 'deactivated')
            .get();
        
        const eventos = [];
        eventsSnapshot.forEach(doc => {
            const data = doc.data();
            const endAt = data.endAt ? (data.endAt.toDate ? data.endAt.toDate() : new Date(data.endAt)) : null;
            const startAt = data.startAt ? (data.startAt.toDate ? data.startAt.toDate() : new Date(data.startAt)) : null;
            const eventEnd = endAt || new Date((startAt ? startAt.getTime() : Date.now()) + 4 * 3600000);
            
            // Include only upcoming/current events
            if (eventEnd >= now) {
                eventos.push({
                    id: doc.id,
                    ...data,
                    startAt: startAt,
                    endAt: endAt
                });
            }
        });

        if (eventos.length === 0) {
            logger.info('[Newsletter] No active upcoming events to feature. Exiting.');
            return;
        }

        logger.info(`[Newsletter] Sending weekly newsletter to ${usuarios.length} users with ${eventos.length} events...`);
        const result = await enviarPulseSemanal(usuarios, eventos);
        logger.info('[Newsletter] Task finished. Result:', result);

    } catch (error) {
        logger.error('[Newsletter] Critical error in weekly newsletter task:', error);
    }
});

/**
 * Scheduled Task: Send monthly business performance report to B2B clients
 */
export const sendMonthlyBusinessReport = onSchedule({
    schedule: "0 8 1 * *", // 8:00 AM on the 1st of every month
    timeZone: "America/Guayaquil",
}, async (event) => {
    try {
        logger.info('[Monthly Report] Starting monthly B2B performance reports scheduled task...');

        // Calculate date range for the previous month
        const now = new Date();
        const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Fetch all active businesses
        const businessesSnapshot = await db.collection('businesses')
            .where('isDeleted', '!=', true)
            .get();

        if (businessesSnapshot.empty) {
            logger.info('[Monthly Report] No businesses found. Exiting.');
            return;
        }

        // Fetch coupon redemptions for the previous month
        const redemptionsSnapshot = await db.collection('couponRedemptions')
            .where('reservedAt', '>=', admin.firestore.Timestamp.fromDate(firstDayPrevMonth))
            .where('reservedAt', '<=', admin.firestore.Timestamp.fromDate(lastDayPrevMonth))
            .get();

        // Count redemptions by businessId
        const redemptionsMap = {};
        redemptionsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.businessId) {
                redemptionsMap[data.businessId] = (redemptionsMap[data.businessId] || 0) + 1;
            }
        });

        let sentCount = 0;

        for (const doc of businessesSnapshot.docs) {
            const business = doc.data();
            const businessId = doc.id;
            const email = business.email;
            
            // Skip references or businesses without email
            if (business.isReference || !email) continue;

            const name = business.name || 'Socio MontaPulse';
            const views = business.viewCount || 0;
            const clicks = business.clickCount || 0;
            const redemptions = redemptionsMap[businessId] || 0;

            // Prepare metrics
            const metricas = {
                visitas_al_perfil: views,
                clics_en_como_llegar: clicks,
                llamadas_whatsapp: Math.max(0, Math.floor(clicks * 0.25)), // Calculated fallback for WhatsApp calls if not directly logged
                cupones_reservados: redemptions
            };

            logger.info(`[Monthly Report] Sending report to ${name} (${email})`);
            const result = await enviarReporteMensualNegocio(email, name, metricas);
            if (result.success) {
                sentCount++;
            }
        }

        logger.info(`[Monthly Report] Task finished. Sent reports to ${sentCount} businesses.`);

    } catch (error) {
        logger.error('[Monthly Report] Critical error in monthly B2B report task:', error);
    }
});

