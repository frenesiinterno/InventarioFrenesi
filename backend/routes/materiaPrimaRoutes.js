const express = require('express');
const router = express.Router();
const materiaPrimaController = require('../controllers/materiaPrimaController');

// Rutas para materias primas
router.get('/', materiaPrimaController.getAll);
router.get('/tipos', materiaPrimaController.getTipos);
router.get('/unidades', materiaPrimaController.getUnidades);
router.get('/stock-bajo', materiaPrimaController.getStockBajo);
router.get('/tipo/:tipoId', materiaPrimaController.getByTipo);
router.get('/:id', materiaPrimaController.getById);
router.post('/', materiaPrimaController.create);
router.put('/:id', materiaPrimaController.update);
router.delete('/:id', materiaPrimaController.delete);
module.exports = router;

