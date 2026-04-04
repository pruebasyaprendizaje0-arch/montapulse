import { onRequest } from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Route: Create Checkout
 */
app.post('/api/create-checkout', async (req, res) => {
    const { amount, currency, description } = req.body;

    logger.info(`[dLocal Go] Creating checkout for ${amount} ${currency}: ${description}`);

    try {
        const parsedAmount = parseFloat(amount);

        // Validar monto
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: `Monto no válido: ${amount}` });
        }

        const endpoints = [
            'https://api.dlocalgo.com/v1/payments',
            'https://api.dlocalgo.com/v1/checkouts'
        ];

        let response = null;
        let lastError = null;

        for (const url of endpoints) {
            try {
                logger.log(`[dLocal Go] Intentando: ${url}`);
                response = await axios.post(url, {
                    amount: parseFloat(parsedAmount.toFixed(2)),
                    currency: currency || 'USD',
                    country: req.body.country || 'MX', 
                    description: description || 'Plan Pulse Pro',
                    success_url: req.get('origin') + '/plans?status=success',
                    back_url: req.get('origin') + '/plans',
                    notification_url: 'https://webhook.site/pulse-notifications'
                }, {
                    auth: {
                        username: process.env.DLOCAL_GO_API_KEY,
                        password: process.env.DLOCAL_GO_SECRET_KEY
                    },
                    timeout: 10000 // 10s timeout
                });
                
                if (response.data) break;
            } catch (err) {
                lastError = err;
                const errorData = err.response?.data || err.message;
                logger.error(`[dLocal Go] Falló ${url}:`, errorData);
            }
        }

        if (response && response.data) {
            logger.info('[dLocal Go] ¡Éxito en la creación!');
            return res.json({ 
                success: true,
                checkout_url: response.data.checkout_url || response.data.redirect_url || response.data.url
            });
        }

        throw new Error('dLocal Go no devolvió una URL de checkout válida.');

    } catch (globalError) {
        const errorDetail = globalError.response?.data || globalError.message;
        logger.error('[dLocal Go] Error crítico en la función:', errorDetail);
        res.status(500).json({ 
            success: false, 
            message: 'Error al conectar con dLocal Go',
            detail: errorDetail 
        });
    }
});

// Exportamos la función bajo el nombre 'api'
export const api = onRequest({ region: "us-central1", minInstances: 0 }, app);
