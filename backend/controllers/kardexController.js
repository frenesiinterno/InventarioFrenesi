const KardexModel = require('../models/KardexModel');

// Obtener movimientos de Kardex por materia prima
exports.getMovimientosByMateria = async (req, res) => {
  try {
    const { materiaPrimaId } = req.params;
    const { fechaDesde, fechaHasta, limit } = req.query;
    
    const options = {
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null,
      limit: limit ? parseInt(limit) : 100
    };

    const movimientos = await KardexModel.getMovimientosByMateria(materiaPrimaId, options);
    res.json({ success: true, data: movimientos });
  } catch (error) {
    console.error('Error en getMovimientosByMateria:', error);
    const errorMessage = error.message || 'Error desconocido';
    // Si el error es que la tabla no existe, dar un mensaje más claro
    if (errorMessage.includes("doesn't exist") || errorMessage.includes("Unknown table")) {
      res.status(500).json({ 
        success: false, 
        message: 'Las tablas del Kardex no existen. Ejecuta la migración SQL: migrations/create_kardex_system.sql' 
      });
    } else {
      res.status(500).json({ success: false, message: errorMessage });
    }
  }
};

// Obtener saldo actual de una materia prima
exports.getSaldoActual = async (req, res) => {
  try {
    const { materiaPrimaId } = req.params;
    const saldo = await KardexModel.getSaldoActual(materiaPrimaId);
    res.json({ success: true, data: saldo });
  } catch (error) {
    console.error('Error en getSaldoActual:', error);
    const errorMessage = error.message || 'Error desconocido';
    // Si el error es que la tabla no existe, dar un mensaje más claro
    if (errorMessage.includes("doesn't exist") || errorMessage.includes("Unknown table")) {
      res.status(500).json({ 
        success: false, 
        message: 'Las tablas del Kardex no existen. Ejecuta la migración SQL: migrations/create_kardex_system.sql' 
      });
    } else {
      res.status(500).json({ success: false, message: errorMessage });
    }
  }
};

// Obtener costo promedio de una materia prima
exports.getCostoPromedio = async (req, res) => {
  try {
    const { materiaPrimaId } = req.params;
    const costoPromedio = await KardexModel.getCostoPromedio(materiaPrimaId);
    res.json({ success: true, data: { costo_promedio: costoPromedio } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener pronóstico de consumo
exports.getPronosticoConsumo = async (req, res) => {
  try {
    const { materiaPrimaId } = req.params;
    const { dias } = req.query;
    const diasAnalizar = dias ? parseInt(dias) : 30;
    
    const pronostico = await KardexModel.calcularPronosticoConsumo(materiaPrimaId, diasAnalizar);
    res.json({ success: true, data: pronostico });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener análisis de consumo por período
exports.getAnalisisConsumo = async (req, res) => {
  try {
    const { materiaPrimaId } = req.params;
    const { fechaDesde, fechaHasta } = req.query;
    
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requieren fechaDesde y fechaHasta' 
      });
    }

    const analisis = await KardexModel.getAnalisisConsumo(
      materiaPrimaId, 
      new Date(fechaDesde), 
      new Date(fechaHasta)
    );
    res.json({ success: true, data: analisis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

