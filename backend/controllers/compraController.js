const CompraModel = require('../models/CompraModel');

// Obtener todas las compras
exports.getAll = async (req, res) => {
  try {
    const compras = await CompraModel.getAll();
    res.json({ success: true, data: compras });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener compra por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const compra = await CompraModel.getById(id);
    if (!compra) {
      return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    }
    res.json({ success: true, data: compra });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Crear compra
exports.create = async (req, res) => {
  try {
    const { proveedor_id, proveedor_nombre, numero_factura, fecha_compra, fecha_factura, items, observaciones } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debe incluir al menos un item en la compra' 
      });
    }

    // Validar items
    for (const item of items) {
      if (!item.materia_prima_id || !item.cantidad || !item.costo_unitario) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cada item debe tener materia_prima_id, cantidad y costo_unitario' 
        });
      }
    }

    const id = await CompraModel.create({
      proveedor_id: proveedor_id || null,
      proveedor_nombre: proveedor_nombre || null,
      numero_factura,
      fecha_compra: fecha_compra || new Date(),
      fecha_factura,
      items,
      observaciones
    });

    res.status(201).json({ 
      success: true, 
      data: { id }, 
      message: 'Compra registrada exitosamente. Los materiales han sido agregados al inventario.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar compra
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CompraModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    }
    res.json({ success: true, message: 'Compra eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

