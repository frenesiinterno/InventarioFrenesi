const express = require('express');
const multer = require('multer');
const importacionController = require('../controllers/importacionController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/catalogo', upload.single('archivo'), importacionController.importCatalogo);
router.post('/fichas', upload.single('archivo'), importacionController.importFichasTecnicas);

module.exports = router;


