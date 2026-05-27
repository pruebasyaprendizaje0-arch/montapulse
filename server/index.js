import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
}
dotenv.config();

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
            model: model || 'minimax/minimax-m2.5:free',
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
        
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor de pagos activo en http://localhost:${PORT}`);
    console.log(`   - Si falla, revisa el archivo 'dlocal_error.log'\n`);
});
