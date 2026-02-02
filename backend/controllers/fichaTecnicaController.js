const FichaTecnicaModel = require('../models/FichaTecnicaModel');

// Obtener ficha técnica completa de un producto
exports.getByProducto = async (req, res) => {
  try {
    const { productoId } = req.params;
    const ficha = await FichaTecnicaModel.getByProducto(productoId);
    const resumen = await FichaTecnicaModel.getResumenByProducto(productoId);
    const total = await FichaTecnicaModel.getTotalByProducto(productoId);

    res.json({
      success: true,
      data: {
        items: ficha,
        resumen: resumen,
        total: total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Agregar materia prima a ficha técnica (solo consumo)
exports.create = async (req, res) => {
  try {
    const { producto_id, materia_prima_id, cantidad } = req.body;

    if (!producto_id || !materia_prima_id || !cantidad) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: producto_id, materia_prima_id, cantidad'
      });
    }

    const id = await FichaTecnicaModel.create({
      producto_id,
      materia_prima_id,
      cantidad
    });

    res.status(201).json({ success: true, data: { id }, message: 'Item agregado a ficha técnica exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar cantidad en ficha técnica
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (cantidad === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar la cantidad'
      });
    }

    const updateData = { cantidad };

    const updated = await FichaTecnicaModel.update(id, updateData);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.json({ success: true, message: 'Ficha técnica actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar materia prima de ficha técnica
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FichaTecnicaModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }
    res.json({ success: true, message: 'Item eliminado de ficha técnica exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
