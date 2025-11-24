const express = require('express');
const router = express.Router();

const { createCita, getAllCitasAdmin, getCitasByUsuario, updateCitaStatus, getCitaById } = require('../controllers/citasController');
const { protect, isAdmin } = require('../middleware/authMiddleware'); // IMPORTA EL MIDDLEWARE (PROTECCION)

// Ruta para crear una nueva cita (pública/cliente)
router.post('/', createCita);

// Ruta para que el admin vea todas las citas
router.get('/admin', protect, isAdmin, getAllCitasAdmin);

// Ruta para que un cliente vea sus citas
// El ':usuarioId' es un parámetro dinámico
router.get('/cliente/:usuarioId', getCitasByUsuario);

// Ruta para que el admin actualice el estado de una cita
router.put('/admin/:id/status', protect, isAdmin, updateCitaStatus);

// Ruta para obtener una sola cita por su Id
router.get('/:id', protect, getCitaById); 

module.exports = router;