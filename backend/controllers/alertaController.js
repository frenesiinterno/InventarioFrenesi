const AlertaModel = require('../models/AlertaModel');

// Obtener todas las alertas no leídas
exports.getNoLeidas = async (req, res) => {
  try {
    const alertas = await AlertaModel.getNoLeidas();
    res.json({ success: true, data: alertas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener todas las alertas
exports.getAll = async (req, res) => {
  try {
    const alertas = await AlertaModel.getAll();
    res.json({ success: true, data: alertas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Marcar alerta como leída
exports.marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await AlertaModel.marcarLeida(id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
    }
    res.json({ success: true, message: 'Alerta marcada como leída' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Marcar todas las alertas como leídas
exports.marcarTodasLeidas = async (req, res) => {
  try {
    const count = await AlertaModel.marcarTodasLeidas();
    res.json({ success: true, message: `${count} alertas marcadas como leídas` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verificar y crear alertas automáticas
exports.verificar = async (req, res) => {
  try {
    const alertasCreadas = await AlertaModel.verificarAlertas();
    res.json({ 
      success: true, 
      message: `${alertasCreadas.length} nuevas alertas creadas`,
      data: { alertasCreadas: alertasCreadas.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar alerta
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AlertaModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
    }
    res.json({ success: true, message: 'Alerta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

