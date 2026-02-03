const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Importar rutas
const materiaPrimaRoutes = require('./backend/routes/materiaPrimaRoutes');
const productoRoutes = require('./backend/routes/productoRoutes');
const fichaTecnicaRoutes = require('./backend/routes/fichaTecnicaRoutes');
const ordenProduccionRoutes = require('./backend/routes/ordenProduccionRoutes');
const alertaRoutes = require('./backend/routes/alertaRoutes');
const inventarioRoutes = require('./backend/routes/inventarioRoutes');
const importacionRoutes = require('./backend/routes/importacionRoutes');
const kardexRoutes = require('./backend/routes/kardexRoutes');
const proveedorRoutes = require('./backend/routes/proveedorRoutes');
const compraRoutes = require('./backend/routes/compraRoutes');
const siigoOcRoutes = require('./backend/routes/siigoOcRoutes');

// Usar rutas
app.use('/api/materia-prima', materiaPrimaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/fichas-tecnicas', fichaTecnicaRoutes);
app.use('/api/ordenes-produccion', ordenProduccionRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/importaciones', importacionRoutes);
app.use('/api/kardex', kardexRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/siigo-ocs', siigoOcRoutes);

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ message: 'API del Sistema de Inventario Frenesi' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;

