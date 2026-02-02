const xlsx = require('xlsx');
const MateriaPrimaModel = require('../models/MateriaPrimaModel');
const TipoMateriaPrimaModel = require('../models/TipoMateriaPrimaModel');
const UnidadMedidaModel = require('../models/UnidadMedidaModel');
const ProductoModel = require('../models/ProductoModel');
const FichaTecnicaModel = require('../models/FichaTecnicaModel');

const normalizeString = (value) => (value === null || value === undefined ? '' : String(value).trim());
const normalizeKey = (value) => normalizeString(value).toUpperCase();
const normalizeUnidad = (value) => normalizeString(value).toUpperCase().replace(/\.$/, '');
const parseDecimal = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const ensureUnidad = async (codigoRaw, caches, stats) => {
  const codigoNormalizado = normalizeUnidad(codigoRaw) || 'UND';
  if (caches.unidades.has(codigoNormalizado)) return caches.unidades.get(codigoNormalizado);

  let unidad = await UnidadMedidaModel.getByCodigo(codigoNormalizado);
  if (!unidad) {
    const nombre = normalizeString(codigoRaw) || codigoNormalizado;
    await UnidadMedidaModel.create({ codigo: codigoNormalizado, nombre, descripcion: null });
    stats.unidadesCreadas += 1;
    unidad = await UnidadMedidaModel.getByCodigo(codigoNormalizado);
  }

  caches.unidades.set(codigoNormalizado, unidad);
  return unidad;
};

const ensureTipo = async (nombreRaw, caches, stats) => {
  const nombreNormalizado = normalizeKey(nombreRaw || 'OTROS') || 'OTROS';
  if (caches.tipos.has(nombreNormalizado)) return caches.tipos.get(nombreNormalizado);

  let tipo = await TipoMateriaPrimaModel.getByNombre(nombreNormalizado);
  if (!tipo) {
    const id = await TipoMateriaPrimaModel.create({ nombre: nombreNormalizado, descripcion: null });
    stats.tiposCreados += 1;
    tipo = await TipoMateriaPrimaModel.getById(id);
  }

  caches.tipos.set(nombreNormalizado, tipo);
  return tipo;
};

const ensureProducto = async (nombreRaw, caches, stats) => {
  const nombreNormalizado = normalizeString(nombreRaw);
  if (!nombreNormalizado) return null;

  if (caches.productos.has(nombreNormalizado)) return caches.productos.get(nombreNormalizado);

  let producto = await ProductoModel.getByNombre(nombreNormalizado);
  if (!producto) {
    const id = await ProductoModel.create({ codigo: null, nombre: nombreNormalizado, descripcion: null });
    stats.productosCreados += 1;
    producto = await ProductoModel.getById(id);
  }

  caches.productos.set(nombreNormalizado, producto);
  return producto;
};

const esFilaTotal = (valor) => {
  const normalizado = normalizeString(valor);
  return normalizado.toUpperCase().startsWith('TOTAL');
};

const ensureMateria = async (nombreRaw, tipo, unidad, precioRaw, caches, stats) => {
  const nombreNormalizado = normalizeString(nombreRaw);
  if (!nombreNormalizado) return null;

  if (caches.materias.has(nombreNormalizado)) return caches.materias.get(nombreNormalizado);

  let materia = await MateriaPrimaModel.getByNombre(nombreNormalizado);
  const precio = parseDecimal(precioRaw);

  if (!materia) {
    const id = await MateriaPrimaModel.create({
      codigo: null,
      nombre: nombreNormalizado,
      tipo_id: tipo.id,
      unidad_medida_id: unidad.id,
      precio_unitario: precio,
      stock_actual: 0,
      stock_minimo: 0
    });
    stats.materiasCreadas += 1;
    materia = await MateriaPrimaModel.getById(id);
  } else {
    const updated = {
      codigo: materia.codigo,
      nombre: materia.nombre,
      tipo_id: tipo.id,
      unidad_medida_id: unidad.id,
      precio_unitario: precio || materia.precio_unitario,
      stock_actual: materia.stock_actual,
      stock_minimo: materia.stock_minimo
    };
    await MateriaPrimaModel.update(materia.id, updated);
    if (precio) {
      materia.precio_unitario = precio;
    }
    stats.materiasActualizadas += 1;
  }

  caches.materias.set(nombreNormalizado, materia);
  return materia;
};

exports.importCatalogo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No se recibió archivo' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes('todos'));
    if (!sheetName) {
      return res.status(400).json({ success: false, message: 'No se encontró la hoja de catálogo en el archivo' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    rows.shift(); // remove header

    const caches = {
      productos: new Map(),
      tipos: new Map(),
      unidades: new Map(),
      materias: new Map()
    };

    const stats = {
      filasProcesadas: 0,
      productosCreados: 0,
      tiposCreados: 0,
      unidadesCreadas: 0,
      materiasCreadas: 0,
      materiasActualizadas: 0
    };

    let productoActual = '';

    for (const row of rows) {
      const [productoCol, tipoCol, materiaCol, unidadCol] = row;
      if (!productoCol && !materiaCol) continue;

      if (normalizeString(productoCol) && !esFilaTotal(productoCol)) {
        productoActual = normalizeString(productoCol);
      }

      if (esFilaTotal(productoCol)) {
        continue;
      }
 
      if (!productoActual) continue;

      const producto = await ensureProducto(productoActual, caches, stats);
      if (!producto) continue;

      const materiaNombre = normalizeString(materiaCol);
      if (!materiaNombre) continue;

      const tipo = await ensureTipo(tipoCol, caches, stats);
      const unidad = await ensureUnidad(unidadCol, caches, stats);

      await ensureMateria(materiaNombre, tipo, unidad, null, caches, stats);
      stats.filasProcesadas += 1;
    }

    res.json({
      success: true,
      message: 'Catálogo importado correctamente',
      data: stats
    });
  } catch (error) {
    console.error('Error importando catálogo:', error);
    res.status(500).json({ success: false, message: 'Error al importar catálogo', detail: error.message });
  }
};

exports.importFichasTecnicas = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No se recibió archivo' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes('ficha'));
    if (!sheetName) {
      return res.status(400).json({ success: false, message: 'No se encontró la hoja de fichas técnicas en el archivo' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    rows.shift(); // remove header

    const caches = {
      productos: new Map(),
      tipos: new Map(),
      unidades: new Map(),
      materias: new Map()
    };

    const stats = {
      filasProcesadas: 0,
      fichasActualizadas: 0,
    nuevasRelaciones: 0,
    productosProcesados: 0
    };

    let productoActual = '';
    const productosLimpiados = new Set();
  const materiaStats = {
    materiasCreadas: 0,
    materiasActualizadas: 0
  };

    for (const row of rows) {
      const [productoCol, tipoCol, materiaCol, unidadCol, cantidadCol, precioCol] = row;
      if (!productoCol && !materiaCol) continue;

      if (normalizeString(productoCol) && !esFilaTotal(productoCol)) {
        productoActual = normalizeString(productoCol);
      }

      if (esFilaTotal(productoCol)) {
        continue;
      }

      if (!productoActual) continue;

      const producto = await ensureProducto(productoActual, caches, stats);
      if (!producto) continue;

      if (!productosLimpiados.has(producto.id)) {
        await FichaTecnicaModel.deleteByProducto(producto.id);
        productosLimpiados.add(producto.id);
        stats.productosProcesados += 1;
      }

      const materiaNombre = normalizeString(materiaCol);
      if (!materiaNombre) continue;

      const tipo = await ensureTipo(tipoCol, caches, stats);
      const unidad = await ensureUnidad(unidadCol, caches, stats);
      const materia = await ensureMateria(materiaNombre, tipo, unidad, precioCol, caches, materiaStats);

      const cantidad = parseDecimal(cantidadCol);
      if (cantidad <= 0) continue;

      await FichaTecnicaModel.create({
        producto_id: producto.id,
        materia_prima_id: materia.id,
        cantidad
      });

      stats.filasProcesadas += 1;
      stats.nuevasRelaciones += 1;
    }

    res.json({
      success: true,
      message: 'Fichas técnicas importadas correctamente',
      data: { ...stats, ...materiaStats }
    });
  } catch (error) {
    console.error('Error importando fichas técnicas:', error);
    res.status(500).json({ success: false, message: 'Error al importar fichas técnicas', detail: error.message });
  }
};


