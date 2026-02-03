const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// Rutas para inventario
router.get('/movimientos', inventarioController.getMovimientos);
router.get('/movimientos/materia/:materiaPrimaId', inventarioController.getMovimientosByMateria);
router.get('/resumen', inventarioController.getResumen);
router.post('/movimientos', inventarioController.createMovimiento);

module.exports = router;

