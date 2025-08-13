// Contenido completo y corregido para tu archivo: api/index.js

const express = require('express');
// La v2 del SDK exporta clases, no un objeto global
const { MercadoPagoConfig, Preference } = require('mercadopago');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN DE CORS ---
const whitelist = [
    'https://darktraining-santuario.vercel.app',
];
const corsOptions = {
  origin: function (origin, callback) {
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
app.get('/api/health', (req, res) => {
    res.status(200).send('OK: El nexo está operativo.');
});

// --- CONFIGURACIÓN DE MERCADO PAGO (Sintaxis v2) ---
const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
    console.error("ERROR CRÍTICO: La variable de entorno MP_ACCESS_TOKEN no está configurada.");
}
// Se inicializa el cliente con la configuración
const client = new MercadoPagoConfig({ accessToken: accessToken });


// --- RUTA PARA CREAR LA PREFERENCIA DE PAGO (Sintaxis v2) ---
app.post('/api/create-preference', async (req, res) => {
    if (!accessToken) {
        return res.status(500).json({ error: 'El servidor de pago no está configurado correctamente.' });
    }
    
    try {
        const { title, price } = req.body;
        if (!title || !price) {
            return res.status(400).json({ error: 'Título y precio son requeridos.' });
        }

        const preferenceData = {
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

        // Se crea una instancia de Preference con el cliente
        const preference = new Preference(client);
        // Se crea la preferencia usando la nueva sintaxis
        const result = await preference.create({ body: preferenceData });

        res.json({ id: result.id });

    } catch (error) {
        console.error("Error al crear la preferencia de pago:", error);
        res.status(500).json({ error: 'Error interno al crear la preferencia de pago.' });
    }
});

// Exporta la app para que Vercel la pueda usar.
module.exports = app;
