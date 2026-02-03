const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const siigoOcController = require('../controllers/siigoOcController');

const router = express.Router();

// Configurar multer para guardar PDFs
const uploadDir = path.join(__dirname, '../../uploads/siigo_ocs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'oc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.get('/', siigoOcController.getAll);
router.get('/:id', siigoOcController.getById);
router.delete('/:id', siigoOcController.deleteOc);
router.post('/procesar-pdf', upload.single('pdf'), siigoOcController.procesarPDF);
router.post('/items/:itemId/asignar-ficha', siigoOcController.asignarFichaTecnica);
router.post('/items/:itemId/procesar', siigoOcController.procesarItem);
router.get('/buscar/fichas-tecnicas', siigoOcController.buscarFichasTecnicas);

module.exports = router;
