import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
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

/**
 * Route: Create Checkout
 * Description: Calls dLocal Go API to generate a checkout session.
 */
app.post('/api/create-checkout', async (req, res) => {
    const { amount, currency, description } = req.body;

    console.log(`[dLocal Go] Creating checkout for ${amount} ${currency}: ${description}`);

    try {
        // dLocal Go Standard Endpoint
        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';
        
        const parsedAmount = parseFloat(amount);

        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: `Monto no válido: ${amount}` });
        }
        
        console.log(`[dLocal Go] Intentando crear pago en: ${DLOCAL_GO_URL}`);
        
        try {
            const response = await axios.post(DLOCAL_GO_URL, {
                amount: parseFloat(parsedAmount.toFixed(2)),
                currency: currency || 'USD',
                country: 'MX', // Ajustado a México (MX) por defecto para dLocal Go
                description: description || 'Plan Pulse Pro',
                success_url: req.get('origin') + '/plans?status=success',
                back_url: req.get('origin') + '/plans',
                notification_url: 'https://webhook.site/pulse-notifications' // Webhook temporal para pruebas
            }, {
                auth: {
                    username: process.env.DLOCAL_GO_API_KEY,
                    password: process.env.DLOCAL_GO_SECRET_KEY
                }
            });

            if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
                console.log('[dLocal Go] ¡Pago creado con éxito!');
                return res.json({ 
                    success: true,
                    checkout_url: response.data.checkout_url || response.data.redirect_url
                });
            }
        } catch (err) {
            const errorStatus = err.response?.status || 500;
            const errorData = err.response?.data || err.message;
            
            console.error(`[dLocal Go] Error ${errorStatus}:`, JSON.stringify(errorData, null, 2));
            
            // Log detallado para diagnóstico
            fs.writeFileSync('dlocal_error.log', JSON.stringify({
                status: errorStatus,
                data: errorData,
                timestamp: new Date().toISOString()
            }, null, 2));

            return res.status(errorStatus).json({ 
                success: false, 
                message: 'Error en la comunicación con dLocal Go',
                details: errorData 
            });
        }

    } catch (globalError) {
        console.error('[Server] Critical Error:', globalError);
        res.status(500).json({ success: false, message: globalError.message });
    }
});

/**
 * Route: AI Proxy for OpenRouter
 */
app.post('/api/ai/openrouter', async (req, res) => {
    try {
        const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
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
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Montapulse Local',
            },
            responseType: stream ? 'stream' : 'json'
        });

        if (stream) {
            response.data.pipe(res);
        } else {
            res.json(response.data);
        }
    } catch (err) {
        console.error('[AI Proxy] OpenRouter Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/**
 * Route: AI Proxy for Gemini
 */
app.post('/api/ai/gemini', async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
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
        console.error('[AI Proxy] Gemini Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/**
 * Route: Send Email with Resend
 */
app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, text, from } = req.body;

    console.log(`[Resend] Intentando enviar email a: ${to}, Asunto: ${subject}`);

    try {
        const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
        if (!apiKey) {
            console.error('[Resend] Error: RESEND_API_KEY no configurado en el servidor.');
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
            console.error('[Resend] Error devuelto por la API:', data.error);
            return res.status(400).json({ success: false, error: data.error });
        }

        console.log('[Resend] ¡Email enviado con éxito!', data);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('[Resend] Error crítico al enviar email:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Route: Create Booking Addon Checkout Session ($5 USD/month)
 */
app.post('/api/booking-addon/checkout', async (req, res) => {
    const { businessId, email } = req.body;
    const origin = req.get('origin') || 'https://montapulse-app.web.app';

    if (!businessId || !email) {
        return res.status(400).json({ success: false, message: 'businessId y email son requeridos.' });
    }

    try {
        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';

        console.log(`[dLocal Go Addon] Creando pago de Addon para negocio ${businessId}`);

        const response = await axios.post(DLOCAL_GO_URL, {
            amount: 5.00,
            currency: 'USD',
            country: 'EC',
            description: 'Activar Botón de Reservas - ubicame.info',
            success_url: origin + '/passport?addon_status=success',
            back_url: origin + '/passport',
            notification_url: origin + '/api/webhook/dlocal-addon?businessId=' + encodeURIComponent(businessId)
        }, {
            auth: {
                username: process.env.DLOCAL_GO_API_KEY,
                password: process.env.DLOCAL_GO_SECRET_KEY
            },
            timeout: 10000
        });

        if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
            // Save state as inactive (pending payment confirmation)
            const addonRef = db.collection('booking_addons').doc(businessId);
            await addonRef.set({
                businessId,
                status: 'inactive',
                paymentMethod: 'dlocal',
                dlocalOrderId: response.data.id || '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return res.json({
                success: true,
                checkout_url: response.data.checkout_url || response.data.redirect_url
            });
        }
        throw new Error('dLocal response did not contain redirect URLs.');
    } catch (err) {
        const errorStatus = err.response?.status || 500;
        const errorData = err.response?.data || err.message;
        console.error(`[dLocal Go Addon] Error ${errorStatus}:`, errorData);

        return res.status(errorStatus).json({
            success: false,
            message: 'Error al conectar con dLocal Go',
            detail: errorData
        });
    }
});

/**
 * Route: Webhook for Booking Addon
 */
app.post('/api/webhook/dlocal-addon', async (req, res) => {
    try {
        const { businessId } = req.query;
        const { status } = req.body;

        const expectedToken = process.env.DLOCAL_WEBHOOK_SECRET;
        const authHeader = req.headers['authorization'];
        
        if (expectedToken) {
            if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
                console.warn(`[Webhook dLocal Addon] Token inválido para negocio ${businessId}`);
                return res.status(401).json({ success: false, message: 'Firma de Webhook no válida' });
            }
        }

        console.log(`[Webhook dLocal Addon] Recibido para negocio ${businessId}, status: ${status}`);

        if (status === 'PAID' && businessId) {
            const addonRef = db.collection('booking_addons').doc(businessId);
            const now = new Date();
            const expires = new Date();
            expires.setDate(now.getDate() + 30);

            await addonRef.set({
                businessId,
                status: 'active',
                paymentMethod: 'dlocal',
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromDate(expires),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Automatically enable bookings in the business config
            const configRef = db.collection('booking_configs').doc(businessId);
            await configRef.set({
                bookingType: 'rooms', // default
                isEnabled: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`[Webhook dLocal Addon] Addon de reservas activado para negocio ${businessId}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('[Webhook dLocal Addon] Error:', error);
        res.status(500).send('Error');
    }
});

/**
 * Route: Create Menu Addon Checkout Session ($5 USD/month)
 */
app.post('/api/menu-addon/checkout', async (req, res) => {
    const { businessId, email } = req.body;
    const origin = req.get('origin') || 'https://montapulse-app.web.app';

    if (!businessId || !email) {
        return res.status(400).json({ success: false, message: 'businessId y email son requeridos.' });
    }

    try {
        const DLOCAL_GO_URL = 'https://api.dlocalgo.com/v1/payments';

        console.log(`[dLocal Go Menu Addon] Creando pago de Addon para negocio ${businessId}`);

        const response = await axios.post(DLOCAL_GO_URL, {
            amount: 5.00,
            currency: 'USD',
            country: 'EC',
            description: 'Activar Menú Digital QR - ubicame.info',
            success_url: origin + '/passport?menu_addon_status=success',
            back_url: origin + '/passport',
            notification_url: origin + '/api/webhook/dlocal-menu?businessId=' + encodeURIComponent(businessId)
        }, {
            auth: {
                username: process.env.DLOCAL_GO_API_KEY,
                password: process.env.DLOCAL_GO_SECRET_KEY
            },
            timeout: 10000
        });

        if (response.data && (response.data.checkout_url || response.data.redirect_url)) {
            // Save state as inactive (pending payment confirmation)
            const bizRef = db.collection('businesses').doc(businessId);
            await bizRef.set({
                menu_premium_active: false,
                menu_subscription: {
                    status: 'inactive',
                    payment_method: 'dlocal',
                    dlocalOrderId: response.data.id || '',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });

            return res.json({
                success: true,
                checkout_url: response.data.checkout_url || response.data.redirect_url
            });
        }
        throw new Error('dLocal response did not contain redirect URLs.');
    } catch (err) {
        const errorStatus = err.response?.status || 500;
        const errorData = err.response?.data || err.message;
        console.error(`[dLocal Go Menu Addon] Error ${errorStatus}:`, errorData);

        return res.status(errorStatus).json({
            success: false,
            message: 'Error al conectar con dLocal Go',
            detail: errorData
        });
    }
});

/**
 * Route: Webhook for Menu Addon
 */
app.post('/api/webhook/dlocal-menu', async (req, res) => {
    try {
        const { businessId } = req.query;
        const { status } = req.body;

        const expectedToken = process.env.DLOCAL_WEBHOOK_SECRET;
        const authHeader = req.headers['authorization'];
        
        if (expectedToken) {
            if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
                console.warn(`[Webhook dLocal Menu] Token inválido para negocio ${businessId}`);
                return res.status(401).json({ success: false, message: 'Firma de Webhook no válida' });
            }
        }

        console.log(`[Webhook dLocal Menu] Recibido para negocio ${businessId}, status: ${status}`);

        if (status === 'PAID' && businessId) {
            const bizRef = db.collection('businesses').doc(businessId);
            const now = new Date();
            const expires = new Date();
            expires.setDate(now.getDate() + 30);

            await bizRef.set({
                menu_premium_active: true,
                menu_subscription: {
                    status: 'active',
                    payment_method: 'dlocal',
                    activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: admin.firestore.Timestamp.fromDate(expires),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });

            console.log(`[Webhook dLocal Menu] Addon de menú digital activado para negocio ${businessId}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('[Webhook dLocal Menu] Error:', error);
        res.status(500).send('Error');
    }
});

/**
 * Route: Create Booking with Concurrency Control (Firestore Transactions)
 */
app.post('/api/bookings/create', async (req, res) => {
    const { 
        businessId, 
        clientName, 
        clientEmail, 
        clientPhone, 
        bookingType, 
        inventoryItemId, 
        startTime, 
        endTime, 
        spotsRequested,
        force
    } = req.body;

    const parsedSpots = parseInt(spotsRequested || 1, 10);

    if (!businessId || !inventoryItemId || !bookingType || !startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos.' });
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            // 1. Verify Active Addon Subscription
            const addonRef = db.collection('booking_addons').doc(businessId);
            const addonDoc = await transaction.get(addonRef);
            if (!addonDoc.exists || addonDoc.data().status !== 'active') {
                throw new Error('ADDON_INACTIVE');
            }
            
            const expiresAt = addonDoc.data().expiresAt?.toDate();
            if (expiresAt && expiresAt < new Date()) {
                throw new Error('ADDON_EXPIRED');
            }

            let reservedItemName = '';

            // 2. Validate availability based on Booking Type to avoid double-booking
            if (bookingType === 'rooms') {
                const roomRef = db.collection('room_inventories').doc(inventoryItemId);
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists) {
                    throw new Error('ROOM_NOT_FOUND');
                }
                const { total_capacity, room_type } = roomDoc.data();
                reservedItemName = room_type || 'Habitación';

                // Parse dates safely: extract YYYY-MM-DD portion first to avoid UTC offset issues
                const startDateStr = (typeof startTime === 'string' && startTime.includes('T'))
                    ? startTime.split('T')[0]
                    : String(startTime).split('T')[0];
                const endDateStr = (typeof endTime === 'string' && endTime.includes('T'))
                    ? endTime.split('T')[0]
                    : String(endTime).split('T')[0];

                // Build list of days [startDate, endDate) — each night of the stay
                const days = [];
                const [sy, sm, sd] = startDateStr.split('-').map(Number);
                const [ey, em, ed] = endDateStr.split('-').map(Number);
                let cur = new Date(Date.UTC(sy, sm - 1, sd));
                const endUtc = new Date(Date.UTC(ey, em - 1, ed));
                while (cur < endUtc) {
                    const y = cur.getUTCFullYear();
                    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
                    const d = String(cur.getUTCDate()).padStart(2, '0');
                    days.push(`${y}-${m}-${d}`);
                    cur.setUTCDate(cur.getUTCDate() + 1);
                }

                console.log(`[Booking Rooms] inventoryItemId=${inventoryItemId}, total_capacity=${total_capacity}, parsedSpots=${parsedSpots}, days=`, days);

                // Retrieve availability documents in transaction
                const availabilityRefs = days.map(day => db.collection('room_availability').doc(`${inventoryItemId}_${day}`));
                const availabilityDocs = [];
                for (const ref of availabilityRefs) {
                    availabilityDocs.push(await transaction.get(ref));
                }

                // Check Capacities
                for (let i = 0; i < days.length; i++) {
                    const doc = availabilityDocs[i];
                    const booked = doc.exists ? (doc.data().bookedRooms || 0) : 0;
                    console.log(`[Booking Rooms] Day ${days[i]}: booked=${booked}, requesting=${parsedSpots}, capacity=${total_capacity}, available=${booked + parsedSpots <= total_capacity}`);
                    if (!force && booked + parsedSpots > total_capacity) {
                        throw new Error('NO_ROOMS_AVAILABLE');
                    }
                }

                // Write Updates
                for (let i = 0; i < days.length; i++) {
                    const doc = availabilityDocs[i];
                    const ref = availabilityRefs[i];
                    const booked = doc.exists ? (doc.data().bookedRooms || 0) : 0;
                    transaction.set(ref, {
                        roomTypeId: inventoryItemId,
                        date: days[i],
                        bookedRooms: booked + parsedSpots,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

            } else if (bookingType === 'tables') {
                const tableRef = db.collection('table_inventories').doc(inventoryItemId);
                const tableDoc = await transaction.get(tableRef);
                if (!tableDoc.exists) {
                    throw new Error('TABLE_NOT_FOUND');
                }
                const { table_identifier, zone_name } = tableDoc.data();
                reservedItemName = `${table_identifier || 'Mesa'} (${zone_name || 'General'})`;

                const dateStr = new Date(startTime).toISOString().split('T')[0];
                const timeSlot = startTime.split('T')[1]?.substring(0, 5) || '19:00';
                
                const tableAvRef = db.collection('table_availability').doc(`${inventoryItemId}_${dateStr}_${timeSlot}`);
                const tableAvDoc = await transaction.get(tableAvRef);
                
                if (!force && tableAvDoc.exists && tableAvDoc.data().isBooked) {
                    throw new Error('TABLE_ALREADY_BOOKED');
                }

                transaction.set(tableAvRef, {
                    tableId: inventoryItemId,
                    date: dateStr,
                    timeSlot,
                    isBooked: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

            } else if (bookingType === 'appointments') {
                const slotRef = db.collection('slot_inventories').doc(inventoryItemId);
                const slotDoc = await transaction.get(slotRef);
                if (!slotDoc.exists) {
                    throw new Error('SLOT_NOT_FOUND');
                }
                const { max_spots_per_slot, service_name } = slotDoc.data();
                reservedItemName = service_name || 'Servicio/Cita';

                const dateStr = new Date(startTime).toISOString().split('T')[0];
                const timeSlot = startTime.split('T')[1]?.substring(0, 5) || '09:00';

                const slotAvRef = db.collection('slot_availability').doc(`${inventoryItemId}_${dateStr}_${timeSlot}`);
                const slotAvDoc = await transaction.get(slotAvRef);

                const booked = slotAvDoc.exists ? (slotAvDoc.data().bookedSpots || 0) : 0;
                if (!force && booked + parsedSpots > max_spots_per_slot) {
                    throw new Error('NO_SPOTS_AVAILABLE');
                }

                transaction.set(slotAvRef, {
                    slotId: inventoryItemId,
                    date: dateStr,
                    timeSlot,
                    bookedSpots: booked + parsedSpots,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 3. Insert Reservation records
            const bookingId = db.collection('bookings').doc().id;
            const bookingRef = db.collection('bookings').doc(bookingId);
            transaction.set(bookingRef, {
                businessId,
                clientName,
                clientEmail,
                clientPhone,
                bookingType,
                inventoryItemId,
                reservedItemName,
                startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
                endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
                spotsRequested: parsedSpots,
                status: force ? 'confirmed' : 'pending',
                notes: req.body.notes || '',
                extraServices: req.body.extraServices || [],
                staffAssigned: req.body.staffAssigned || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            const lineRef = db.collection('booking_lines').doc();
            transaction.set(lineRef, {
                bookingId,
                inventoryItemId,
                startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
                endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
                spotsReserved: parsedSpots,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { bookingId };
        });

        return res.status(201).json({ success: true, bookingId: result.bookingId, message: 'Reserva creada exitosamente.' });
    } catch (err) {
        console.error('[Booking Create Error]:', err);
        let status = 400;
        let message = 'Error al procesar la reserva';
        if (err.message === 'ADDON_INACTIVE') message = 'El negocio no tiene activo el módulo de reservas.';
        else if (err.message === 'ADDON_EXPIRED') message = 'La suscripción de reservas de este negocio ha expirado.';
        else if (err.message === 'NO_ROOMS_AVAILABLE') message = 'No hay habitaciones disponibles para estas fechas.';
        else if (err.message === 'TABLE_ALREADY_BOOKED') message = 'La mesa ya está ocupada en este horario.';
        else if (err.message === 'NO_SPOTS_AVAILABLE') message = 'No hay suficientes cupos para este turno.';
        else if (err.message === 'ROOM_NOT_FOUND' || err.message === 'TABLE_NOT_FOUND' || err.message === 'SLOT_NOT_FOUND') message = 'El elemento de inventario seleccionado no existe.';
        else { status = 500; message = err.message; }

        return res.status(status).json({ success: false, error: message });
    }
});

/**
 * Route: Register Business Visit (Anti-spam / Bot Filtering / Unique IPs)
 */
app.post('/api/business/visit', async (req, res) => {
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
            console.log(`[Visit API] Ignored bot/crawler request for business: ${businessId}, UA: ${userAgent}`);
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
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor de pagos activo en http://localhost:${PORT}`);
    console.log(`   - Si falla, revisa el archivo 'dlocal_error.log'\n`);
});

