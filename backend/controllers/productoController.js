

const ProductoModel = require('../models/ProductoModel');

// Obtener todos los productos
exports.getAll = async (req, res) => {
  try {
    const productos = await ProductoModel.getAll();
    res.json({ success: true, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener Producto por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await ProductoModel.getById(id);
    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    res.json({ success: true, data: producto });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear nuevo Producto
exports.create = async (req, res) => {
  try {
    const { codigo, nombre, descripcion } = req.body;
  
    if (!nombre) {
      return res.status(400).json({ 
        success: false, 
        message: 'Falta campo requerido: nombre' 
      });
    } 

    const id = await ProductoModel.create({
      codigo,
      nombre,
      descripcion: descripcion || null
    });

    res.status(201).json({ success: true, data: { id }, message: 'Producto creado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar Producto
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion } = req.body;

    const updated = await ProductoModel.update(id, {
      codigo,
      nombre,
      descripcion: descripcion || null
    });

    

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado'});
    }

    res.json({ success: true, message: 'Producto actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Eliminar Producto
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ProductoModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener top productos más costosos
exports.getTopCostosos = async (req, res) => {
  try {
    const productos = await ProductoModel.getTopCostosos();
    res.json({ success: true, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};