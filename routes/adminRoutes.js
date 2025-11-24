const express = require('express');
const router = express.Router();

const { protect, isAdmin } = require('../middleware/authMiddleware');
const { bloquearHorario, getAllBloqueos, deleteBloqueo  } = require('../controllers/disponibilidadController');
// funciones del adminController
const { getAllClientes, createCitaAdmin, createServicio, updateServicio, deleteServicio, deleteCliente, deleteServicioPermanente, getAllServiciosAdmin, addServicioOpcion, addOpcionVariacion} = require('../controllers/adminController');

// --- Rutas de Disponibilidad (Bloquear horario) ---
router.post('/disponibilidad/bloquear', protect, isAdmin, bloquearHorario);

// --- Rutas de Disponibilidad (Ver HorariosBloqueados) ---
router.get('/disponibilidad', protect, isAdmin, getAllBloqueos);

// --- Rutas de Disponibilidad (Eliminar HorarioBloqueado)---
router.delete('/disponibilidad/:id', protect, isAdmin, deleteBloqueo);

// --- Rutas de Clientes ---
router.get('/clientes', protect, isAdmin, getAllClientes);

// --- RUTA DE CITAS ---
router.post('/citas', protect, isAdmin, createCitaAdmin);

// ---RUTA DE CREAR SERVICIOS---
router.post('/servicios', protect, isAdmin, createServicio);

// ---RUTA DE ACTUALIZAR SERVICIOS---
router.put('/servicios/:id', protect, isAdmin, updateServicio);

// ---RUTA DE ELIMINAR SERVICIOS---
router.delete('/servicios/:id', protect, isAdmin, deleteServicio);

// ---RUTA DE ELIMINAR CLIENTES---
router.delete('/clientes/:id', protect, isAdmin, deleteCliente);

// ---RUTA DE ELMINAR SERVICIOS---
router.delete('/servicios/:id/permanente', protect, isAdmin, deleteServicioPermanente);

// ---RUTA PARA DESACTIVAR SERVICIOS---
router.delete('/servicios/:id', protect, isAdmin, deleteServicioPermanente);

// ---RUTA PARA VISTA DE SERVICIOS---
router.get('/servicios', protect, isAdmin, getAllServiciosAdmin);

// ---RUTA PARA VARIACION DE OPCIONES DE SERVICIOS---
router.post('/servicios/:servicio_id/opciones', protect, isAdmin, addServicioOpcion);

// ---RUTA PARA VARIACION DE OPCIONES DE PRECIOS---
router.post('/opciones/:opcion_id/variaciones', protect, isAdmin, addOpcionVariacion);

module.exports = router;