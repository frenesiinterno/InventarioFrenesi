const MateriaPrimaModel = require('../models/MateriaPrimaModel');
const TipoMateriaPrimaModel = require('../models/TipoMateriaPrimaModel');
const UnidadMedidaModel = require('../models/UnidadMedidaModel');

const parseDecimal = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Obtener todas las materias primas
exports.getAll = async (req, res) => {
  try {
    const materias = await MateriaPrimaModel.getAll();
    res.json({ success: true, data: materias });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Obtener materia prima por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const materia = await MateriaPrimaModel.getById(id);
    if (!materia) {
      return res.status(404).json({ success: false, message: 'Materia prima no encontrada' });
    }
    res.json({ success: true, data: materia });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear nueva materia prima
exports.create = async (req, res) => {
  try {
    const { codigo, nombre, tipo_id, unidad_medida_id, precio_unitario, stock_actual, stock_minimo } = req.body;

    const tipoIdNumber = Number(tipo_id);
    const unidadIdNumber = Number(unidad_medida_id);

    if (!nombre || Number.isNaN(tipoIdNumber) || Number.isNaN(unidadIdNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan campos requeridos: nombre, tipo_id, unidad_medida_id' 
      });
    }

    const id = await MateriaPrimaModel.create({
      codigo,
      nombre,
      tipo_id: tipoIdNumber,
      unidad_medida_id: unidadIdNumber,
      precio_unitario: parseDecimal(precio_unitario),
      stock_actual: parseDecimal(stock_actual),
      stock_minimo: parseDecimal(stock_minimo)
    });

    res.status(201).json({ success: true, data: { id }, message: 'Materia prima creada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar materia prima
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, tipo_id, unidad_medida_id, precio_unitario, stock_actual, stock_minimo } = req.body;
    const tipoIdNumber = Number(tipo_id);
    const unidadIdNumber = Number(unidad_medida_id);

    if (Number.isNaN(tipoIdNumber) || Number.isNaN(unidadIdNumber)) {
      return res.status(400).json({
        success: false,
        message: 'tipo_id y unidad_medida_id deben ser numéricos'
      });
    }

    const updated = await MateriaPrimaModel.update(id, {
      codigo,
      nombre,
      tipo_id: tipoIdNumber,
      unidad_medida_id: unidadIdNumber,
      precio_unitario: parseDecimal(precio_unitario),
      stock_actual: parseDecimal(stock_actual),
      stock_minimo: parseDecimal(stock_minimo)
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Materia prima no encontrada' });
    }

    res.json({ success: true, message: 'Materia prima actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar materia prima
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MateriaPrimaModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Materia prima no encontrada' });
    }
    res.json({ success: true, message: 'Materia prima eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener materias primas por tipo
exports.getByTipo = async (req, res) => {
  try {
    const { tipoId } = req.params;
    const materias = await MateriaPrimaModel.getByTipo(tipoId);
    res.json({ success: true, data: materias });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener tipos de materia prima
exports.getTipos = async (req, res) => {
  try {
    const tipos = await TipoMateriaPrimaModel.getAll();
    res.json({ success: true, data: tipos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener unidades de medida
exports.getUnidades = async (req, res) => {
  try {
    const unidades = await UnidadMedidaModel.getAll();
    res.json({ success: true, data: unidades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener materias primas con stock bajo
exports.getStockBajo = async (req, res) => {
  try {
    const materias = await MateriaPrimaModel.getStockBajo();
    res.json({ success: true, data: materias });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

