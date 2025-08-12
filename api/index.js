// Contenido completo para tu archivo: api/index.js

const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN DE CORS ---
// Lista de orígenes permitidos
const whitelist = [
    'https://darktraining-santuario.vercel.app', // Tu URL de producción
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitimos orígenes de la whitelist y también las URLs de preview de Vercel
    if (!origin || whitelist.indexOf(origin) !== -1 || /--[a-z0-9-]+\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acceso denegado por una política de CORS estricta.'));
    }
  }
};

app.use(cors(corsOptions)); 
app.use(express.json());

// --- CHEQUEO DE SALUD ---
// Vercel ahora encontrará esta ruta en /api/health
app.get('/api/health', (req, res) => {
    res.status(200).send('OK: El nexo está operativo.');
});

// --- CONFIGURACIÓN DE MERCADO PAGO ---
const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
    console.error("ERROR CRÍTICO: La variable de entorno MP_ACCESS_TOKEN no está configurada.");
} else {
    mercadopago.configure({
        access_token: accessToken
    });
}

// --- RUTA PARA CREAR LA PREFERENCIA DE PAGO ---
// Vercel ahora encontrará esta ruta en /api/create-preference
app.post('/api/create-preference', async (req, res) => {
    if (!accessToken) {
        return res.status(500).json({ error: 'El servidor de pago no está configurado correctamente.' });
    }
    
    try {
        const { title, price } = req.body;
        if (!title || !price) {
            return res.status(400).json({ error: 'Título y precio son requeridos.' });
        }

        let preference = {
            items: [{
                title: title,
                unit_price: Number(price),
                quantity: 1,
            }],
            back_urls: {
                success: "https://darksanctum.com.mx/pages/gracias-por-tu-compra",
                failure: "https://darksanctum.com.mx/pages/pago-fallido",
                pending: "https://darksanctum.com.mx/pages/pago-pendiente"
            },
            auto_return: "approved",
        };

        const response = await mercadopago.preferences.create(preference);
        res.json({ id: response.body.id });

    } catch (error) {
        console.error("Error al crear la preferencia de pago:", error);
        res.status(500).json({ error: 'Error interno al crear la preferencia de pago.' });
    }
});

// Exporta la app para que Vercel la pueda usar.
module.exports = app;
