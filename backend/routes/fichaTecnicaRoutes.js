const express = require('express');
const router = express.Router();
const fichaTecnicaController = require('../controllers/fichaTecnicaController');

// Rutas para fichas técnicas
router.get('/producto/:productoId', fichaTecnicaController.getByProducto);
router.post('/', fichaTecnicaController.create);
router.put('/:id', fichaTecnicaController.update);
router.delete('/:id', fichaTecnicaController.delete);

module.exports = router;

