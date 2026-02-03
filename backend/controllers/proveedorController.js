const ProveedorModel = require('../models/ProveedorModel');

// Obtener todos los proveedores
exports.getAll = async (req, res) => {
  try {
    const { incluirInactivos } = req.query;
    const proveedores = incluirInactivos === 'true' 
      ? await ProveedorModel.getAllIncludingInactive()
      : await ProveedorModel.getAll();
    res.json({ success: true, data: proveedores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener proveedor por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const proveedor = await ProveedorModel.getById(id);
    if (!proveedor) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }
    res.json({ success: true, data: proveedor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear proveedor
exports.create = async (req, res) => {
  try {
    const { nombre, nit, telefono, email, direccion, contacto, observaciones } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre del proveedor es obligatorio' 
      });
    }
    
    const id = await ProveedorModel.create({
      nombre: nombre.trim(),
      nit,
      telefono,
      email,
      direccion,
      contacto,
      observaciones
    });
   
    res.status(201).json({ success: true, data: { id }, message: 'Proveedor creado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar proveedor
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, nit, telefono, email, direccion, contacto, observaciones, activo } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre del proveedor es obligatorio' 
      });
    }

    const updated = await ProveedorModel.update(id, {
      nombre: nombre.trim(),
      nit,
      telefono,
      email,
      direccion,
      contacto,
      observaciones,
      activo
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    res.json({ success: true, message: 'Proveedor actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar proveedor
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ProveedorModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }
    res.json({ success: true, message: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener compras de un proveedor
exports.getCompras = async (req, res) => {
  try {
    const { id } = req.params;
    const compras = await ProveedorModel.getComprasByProveedor(id);
    res.json({ success: true, data: compras });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



