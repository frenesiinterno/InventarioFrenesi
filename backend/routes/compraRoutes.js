const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compraController');

router.get('/', compraController.getAll);
router.get('/:id', compraController.getById);
router.post('/', compraController.create);
router.delete('/:id', compraController.delete);

module.exports = router;

