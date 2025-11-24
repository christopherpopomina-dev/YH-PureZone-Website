const express = require('express');
const router = express.Router();
const { getDisponibilidad } = require('../controllers/disponibilidadController');

// Ruta pública para que los clientes vean los horarios disponibles
router.get('/', getDisponibilidad);

module.exports = router;