require('dotenv').config(); // Carga las variables de entorno desde .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => console.log('Conectado a MongoDB'));

const Servicio = mongoose.model('Servicio', new mongoose.Schema({
    servicio: String,
    subservicios: [{
        subservicio: String,
        trabajos: [{
            trabajo: String,
            precio: Number
        }]
    }]
}));

let trabajosMostrados = [];

const imagePath = path.join('D:/Chatbots/AppBot/chat/backend/images');
app.use('/images', express.static(imagePath));

// Servir archivos estáticos desde el directorio raíz
app.use(express.static(path.join(__dirname)));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
    }
});


app.post('/chatbot', async (req, res) => {
    const message = req.body.message.trim().toLowerCase();
    const data = req.body.data || {};
    console.log("Mensaje recibido:", message);
    console.log("Datos recibidos del frontend:", data);

    try {
        if (message === 'servicios') {
            const servicios = await Servicio.find({}, 'servicio').lean();
            const nombresServicios = servicios.map(s => s.servicio);
            console.log("Nombres de servicios:", nombresServicios);
            res.json({ reply: nombresServicios });

        } else if (message.startsWith('subservicios de ')) {
            const servicioNombre = message.substring(16).trim();
            const servicios = await Servicio.find({ servicio: { $regex: servicioNombre, $options: 'i' } }).lean();
            if (servicios.length > 0) {
                const nombresSubservicios = servicios.reduce((acc, servicio) => {
                    servicio.subservicios.forEach(subservicio => acc.push(subservicio.subservicio));
                    return acc;
                }, []);
                res.json({ reply: nombresSubservicios });
            } else {
                res.json({ reply: 'Servicio no encontrado' });
            }
        } else if (message.startsWith('trabajos de ')) {
            const subservicioNombre = message.substring(13).trim();
            const servicios = await Servicio.find({ 'subservicios.subservicio': { $regex: subservicioNombre, $options: 'i' } }).lean();
            if (servicios.length > 0) {
                trabajosMostrados = [];
                const trabajos = servicios.reduce((acc, servicio) => {
                    servicio.subservicios.forEach(subservicio => {
                        if (subservicio.subservicio.toLowerCase().includes(subservicioNombre.toLowerCase())) {
                            subservicio.trabajos.forEach(trabajo => acc.push(`${trabajo.trabajo} - Precio: $${trabajo.precio}`));
                            trabajosMostrados = [...trabajosMostrados, ...subservicio.trabajos];
                        }
                    });
                    return acc;
                }, []);
                console.log("Trabajos mostrados al cliente:", trabajosMostrados);
                res.json({ reply: trabajos });
            } else {
                res.json({ reply: 'Subservicio no encontrado' });
            }
        } else if (message.startsWith('trabajosseleccionados:')) {
            const selectedIndices = message.substring(22).split(',').map(Number);
            const selectedTrabajos = selectedIndices
                .filter(index => index >= 0 && index < trabajosMostrados.length)
                .map(index => trabajosMostrados[index]);
            console.log("Índices seleccionados (backend):", selectedIndices);
            console.log("Trabajos seleccionados:", selectedTrabajos);

            if (selectedTrabajos.length > 0) {
                const trabajosNombres = selectedTrabajos
                    .filter(t => t && t.trabajo)
                    .map(t => t.trabajo)
                    .join(', ');

                const ubicacion = data.address || "Ubicación no proporcionada";
                const lat = data.lat || "No disponible";
                const lng = data.lng || "No disponible";

                const mailOptions = {
                    from: 'aguirre3590@gmail.com',
                    to: data.email,
                    subject: 'Nueva incidencia',
                    html: `
                        <strong>Incidencia:</strong> ${data.comment}<br>
                        <strong>Teléfono:</strong> ${data.phone}<br>
                        <strong>Correo:</strong> ${data.email}<br>
                        <strong>Ubicación:</strong> ${ubicacion}<br>
                        <strong>Coordenadas:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" style="color: #1a73e8; text-decoration: underline;">Ver en Google Maps</a><br>
                        <strong>Trabajos:</strong> ${trabajosNombres}
                    `,
                    text: `Incidencia: ${data.comment}\nTeléfono: ${data.phone}\nCorreo: ${data.email}\nUbicación: ${ubicacion}\nCoordenadas: https://www.google.com/maps/search/?api=1&query=${lat},${lng}\nTrabajos: ${trabajosNombres}`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        res.status(500).json({ message: 'Error al enviar el correo' });
                    } else {
                        console.log('Correo enviado: ' + info.response);
                        res.json({
                            reply: `Servicios contratados exitosamente. Gracias por tu compra: ${trabajosNombres}. Correo enviado correctamente.`,
                            emailSent: true,
                            trabajosNombres: trabajosNombres
                        });
                    }
                });
                trabajosMostrados = [];
            } else {
                res.json({
                    reply: 'No se seleccionaron trabajos válidos. Por favor, selecciona al menos un trabajo.'
                });
            }
        } else if (["quiénes somos", "contacto", "asistencia remota"].includes(message)) {
            res.json({ reply: `Información sobre ${message}.` });
        } else {
            res.json({ reply: 'Gracias por su compra!!' });
        }
    } catch (error) {
        console.error("Error en la solicitud del chatbot:", error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Enviar index.html para cualquier otra rutas
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));