const express = require('express');
const router = express.Router();
const multer = require('multer');
const ordenProduccionController = require('../controllers/ordenProduccionController');

// Configurar multer para recibir archivos PDF
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB máximo
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'El archivo es demasiado grande. Máximo 10MB.' });
    }
    return res.status(400).json({ success: false, message: `Error al subir archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message || 'Error al procesar el archivo' });
  }
  next();
};

// Rutas para órdenes de producción
router.get('/', ordenProduccionController.getAll);
router.get('/:id', ordenProduccionController.getById);
router.get('/:id/items', ordenProduccionController.getItems);
router.post('/', ordenProduccionController.create);
router.post('/cargar-pdf', upload.single('archivo'), handleMulterError, ordenProduccionController.cargarPDF);
router.put('/:id', ordenProduccionController.update);
router.delete('/:id', ordenProduccionController.delete);
router.post('/:id/procesar', ordenProduccionController.procesar);
router.post('/:id/procesar-completa', ordenProduccionController.procesarOrdenCompleta);

module.exports = router;

