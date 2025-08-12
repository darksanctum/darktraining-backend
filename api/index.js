const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');

const app = express();

// EN TU ARCHIVO DE BACKEND (index.js o app.js)

// CONFIGURACIÓN DE CORS MÁS FLEXIBLE
const whitelist = [
    'https://darktraining-santuario.vercel.app', // Tu URL de producción
    'http://localhost:3000', // Si pruebas localmente
    'http://127.0.0.1:5500' // Común para Live Server de VSCode
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite peticiones sin 'origin' (como las de Postman o apps móviles) Y las de la whitelist.
    // El regex permite cualquier subdominio de vercel.app, muy útil para previews.
    if (!origin || whitelist.indexOf(origin) !== -1 || /--[a-z0-9-]+\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acceso denegado por CORS'));
    }
  }
};

app.use(cors(corsOptions));
// ... el resto de tu código
app.use(express.json());

// Chequeo de salud
app.get('/api/health', (req, res) => {
    res.status(200).send('OK: El nexo está operativo.');
});

// CONFIGURACIÓN DE MERCADO PAGO
const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
    console.error("ERROR CRÍTICO: La variable de entorno MP_ACCESS_TOKEN no está configurada.");
} else {
    mercadopago.configure({
        access_token: accessToken
    });
}

// RUTA PARA CREAR LA PREFERENCIA DE PAGO
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

// Exporta la app para Vercel.
module.exports = app;
