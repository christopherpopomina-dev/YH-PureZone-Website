const express = require('express');
const router = express.Router();

const { getAllServicios } = require('../controllers/serviciosController');

// La única ruta aquí es la pública para obtener los servicios
router.get('/', getAllServicios);

module.exports = router;