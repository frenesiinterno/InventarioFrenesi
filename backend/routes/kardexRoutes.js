const express = require('express');
const router = express.Router();
const kardexController = require('../controllers/kardexController');

// Obtener movimientos de Kardex por materia prima
router.get('/materia/:materiaPrimaId/movimientos', kardexController.getMovimientosByMateria);

// Obtener saldo actual de una materia prima
router.get('/materia/:materiaPrimaId/saldo', kardexController.getSaldoActual);

// Obtener costo promedio de una materia prima
router.get('/materia/:materiaPrimaId/costo-promedio', kardexController.getCostoPromedio);

// Obtener pronóstico de consumo
router.get('/materia/:materiaPrimaId/pronostico', kardexController.getPronosticoConsumo);

// Obtener análisis de consumo por período
router.get('/materia/:materiaPrimaId/analisis', kardexController.getAnalisisConsumo);

module.exports = router;

