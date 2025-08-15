// Este es el corazón de tu backend automatizado.

const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// --- CONFIGURACIÓN GENERAL ---
app.use(cors()); // Para desarrollo, podemos ser más permisivos. En producción, ajusta los orígenes.
app.use(express.json());

// --- INICIALIZACIÓN DE SERVICIOS ---

// Cliente de Mercado Pago: Usa tu Access Token de las variables de entorno.
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// Transportador de Nodemailer: Configurado para enviar emails.
// NOTA IMPORTANTE: Deberás crear variables de entorno en Vercel para EMAIL_USER y EMAIL_PASS.
// Si usas Gmail, EMAIL_USER es tu correo y EMAIL_PASS es una "Contraseña de Aplicación" que generas en la configuración de seguridad de tu cuenta de Google.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Host para Gmail. Cambia si usas otro servicio.
    port: 465,
    secure: true, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER, // Tu dirección de correo
        pass: process.env.EMAIL_PASS, // Tu contraseña de aplicación
    },
});

// --- RUTAS DE LA API ---

// 1. RUTA PARA CREAR LA PREFERENCIA DE PAGO
// El frontend llamará a esta ruta para obtener un ID de preferencia.
app.post('/api/create-preference', async (req, res) => {
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
                success: "https://darktraining-santuario.vercel.app/gracias", // Una página de "Gracias" que puedes crear
                failure: "https://darktraining-santuario.vercel.app/pago-fallido",
            },
            auto_return: "approved",
            // URL del Webhook: A donde Mercado Pago nos notificará sobre el pago.
            // DEBES reemplazar 'https://tu-backend.vercel.app' con la URL real de tu backend desplegado en Vercel.
            notification_url: `${process.env.BACKEND_URL}/api/payment-webhook`,
        };

        const preference = new Preference(mpClient);
        const result = await preference.create({ body: preferenceData });

        res.json({ id: result.id });

    } catch (error) {
        console.error("Error al crear la preferencia:", error);
        res.status(500).json({ error: 'Error interno al crear la preferencia.' });
    }
});

// 2. RUTA PARA RECIBIR WEBHOOKS DE PAGO
// Mercado Pago llamará a esta ruta automáticamente después de un pago.
app.post('/api/payment-webhook', async (req, res) => {
    console.log("Webhook de Mercado Pago recibido.");

    try {
        const notification = req.body;
        // Verificamos que sea una notificación de pago y que sea una acción de pago creado/actualizado.
        if (notification.type === 'payment' && notification.action === 'payment.created') {
            console.log(`Procesando pago con ID: ${notification.data.id}`);

            // Obtenemos los detalles completos del pago desde Mercado Pago
            const payment = await new Payment(mpClient).get({ id: notification.data.id });

            // Si el pago está aprobado, enviamos el email.
            if (payment.status === 'approved') {
                const payerEmail = payment.payer.email;
                const payerName = payment.payer.first_name || 'nuevo adepto';

                console.log(`Pago aprobado para ${payerEmail}. Enviando email de bienvenida...`);

                // Configuración del Email
                const mailOptions = {
                    from: `"DARKTRAINING" <${process.env.EMAIL_USER}>`,
                    to: payerEmail,
                    subject: "Tu transformación ha comenzado | Siguientes pasos - DARKTRAINING",
                    html: `
                        <h1>¡El pacto ha sido forjado, ${payerName}!</h1>
                        <p>Bienvenido al Santuario. Tu disciplina te ha traído hasta aquí, ahora empieza el verdadero trabajo.</p>
                        <p>Para poder diseñar tu plan de batalla personalizado, necesito que completes el siguiente formulario de iniciación. Tómate tu tiempo y sé lo más detallado posible.</p>
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLSfWx2lqQbwlNibUg9GRNjz7hA_OQhh4t2ajy9-uijBo2ftEpg/viewform?usp=header" style="background-color: #CF2323; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: sans-serif;">
                            Comenzar: Llenar Formulario de Iniciación
                        </a>
                        <p>Una vez completado, recibirás tu plan en la app de Kahunas en un plazo de 24-48 horas.</p>
                        <p>Que la oscuridad guíe tu esfuerzo.</p>
                    `
                };

                // Envío del email
                await transporter.sendMail(mailOptions);
                console.log(`Email enviado con éxito a ${payerEmail}`);
            }
        }

        // Respondemos a Mercado Pago con un 200 OK para que sepa que recibimos la notificación.
        res.status(200).send('OK');

    } catch (error) {
        console.error("Error en el webhook de Mercado Pago:", error);
        res.status(500).send('Error procesando el webhook.');
    }
});

// Exportamos la app para que Vercel la pueda usar.
module.exports = app;
