const express = require('express');
const router = express.Router();
const alertaController = require('../controllers/alertaController');

// Rutas para alertas
router.get('/', alertaController.getAll);
router.get('/no-leidas', alertaController.getNoLeidas);
router.post('/verificar', alertaController.verificar);
router.put('/:id/leida', alertaController.marcarLeida);
router.put('/marcar-todas-leidas', alertaController.marcarTodasLeidas);
router.delete('/:id', alertaController.delete);

module.exports = router;

