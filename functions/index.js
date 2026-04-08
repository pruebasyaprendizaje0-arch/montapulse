import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
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
                notification_url: 'https://webhook.site/pulse-notifications'
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

// Exportamos la función bajo el nombre 'api'
export const api = onRequest({
    region: "us-central1",
    minInstances: 0,
    invoker: "public"
}, app);
