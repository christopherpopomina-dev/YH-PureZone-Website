const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { getMiPerfil, updateMiPerfil, cancelarMiCita, addMiDireccion, getMisCitas, crearMiReseña, deleteMiDireccion } = require('../controllers/clienteController');

// Ruta para obtener el perfil del usuario logueado
router.get('/perfil', protect, getMiPerfil);

// Ruta para actualizar el perfil del usuario logueado
router.put('/perfil', protect, updateMiPerfil);

// Ruta para cancelar una cita
router.put('/citas/:id/cancelar', protect, cancelarMiCita);

// Ruta para agregar una dirección
router.post('/direcciones', protect, addMiDireccion);

// Ruta para obtener las citas del usuario logueado
router.get('/citas', protect, getMisCitas);

// Ruta para crear una reseña
router.post('/resenas', protect, crearMiReseña);


module.exports = router; 