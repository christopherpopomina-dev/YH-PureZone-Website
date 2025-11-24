require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000;


// Habilita CORS para todas las rutas.
app.use(cors()); 

// Middleware para que Express pueda entender el JSON de los bodies de las peticiones POST y PUT.
app.use(express.json());

// Middleware para servir los archivos estáticos del frontend (HTML, CSS, JS de la carpeta 'frontend').
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));


// --- 2. IMPORTACIÓN DE RUTAS DE LA API ---
const serviciosRoutes = require('./routes/serviciosRoutes'); 
const authRoutes = require('./routes/authRoutes');
const citasRoutes = require('./routes/citasRoutes');
const adminRoutes = require('./routes/adminRoutes');
const disponibilidadRoutes = require('./routes/disponibilidadRoutes');
const clienteRoutes = require('./routes/clienteRoutes');


// --- 3. DEFINICIÓN DE RUTAS DE LA API ---
// El servidor usará estas rutas para cualquier petición que empiece con '/api/...'
app.use('/api/servicios', serviciosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/disponibilidad', disponibilidadRoutes);
app.use('/api/cliente', clienteRoutes);


// --- 4. INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});