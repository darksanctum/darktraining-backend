const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');

const app = express();

// Configuración de CORS más explícita para permitir peticiones
app.use(cors()); 
app.use(express.json());

// Chequeo de salud para verificar que el servidor está vivo
app.get('/api/health', (req, res) => {
    console.log("Health check endpoint was hit");
    res.status(200).send('OK');
});

// CONFIGURA TUS CREDENCIALES DE MERCADO PAGO
mercadopago.configure({
    access_token: 'APP_USR-5619495760513524-080723-81f6b33e3444f7b8789cfc03c8cd68c9-2610585917'
});

// RUTA PARA CREAR LA PREFERENCIA DE PAGO
app.post('/api/create-preference', async (req, res) => {
    console.log("Received request to create preference with body:", req.body);
    try {
        const { title, price } = req.body;

        if (!title || !price) {
            console.error("Validation failed: Title or price missing.");
            return res.status(400).json({ error: 'Título y precio son requeridos.' });
        }

        let preference = {
            items: [
                {
                    title: title,
                    unit_price: Number(price),
                    quantity: 1,
                }
            ],
            back_urls: {
                success: "https://darksanctum.com.mx/pages/gracias-por-tu-compra",
                failure: "https://darksanctum.com.mx/pages/pago-fallido",
                pending: "https://darksanctum.com.mx/pages/pago-pendiente"
            },
            auto_return: "approved",
        };

        const response = await mercadopago.preferences.create(preference);
        console.log("Successfully created preference:", response.body.id);
        res.json({ id: response.body.id });

    } catch (error) {
        console.error("Error creating preference:", error);
        res.status(500).json({ error: 'Error al crear la preferencia de pago.' });
    }
});

// La siguiente línea es para desarrollo local, Vercel la ignora.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Exporta la app para que Vercel la pueda usar como una función serverless.
// ESTA LÍNEA ES LA CORRECCIÓN CLAVE.
module.exports = app;
