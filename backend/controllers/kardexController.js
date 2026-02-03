const KardexModel = require('../models/KardexModel');
const db = require('../database/db');

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

// Obtener movimientos agrupados por orden de producción
exports.getMovimientosByOrden = async (req, res) => {
  try {
    const { ordenId } = req.params;

    // Obtener movimientos de salida de la orden
    const [movimientos] = await db.execute(
      `SELECT
        k.*,
        lmp.cantidad_original,
        lmp.cantidad_disponible,
        lmp.costo_unitario as lote_costo_unitario,
        lmp.fecha_ingreso,
        mp.nombre as materia_nombre,
        mp.unidad_base,
        op.numero_orden,
        op.fecha as orden_fecha,
        op.estado as orden_estado
      FROM kardex k
      INNER JOIN lotes_materia_prima lmp ON k.lote_id = lmp.id
      INNER JOIN materias_primas mp ON lmp.materia_prima_id = mp.id
      INNER JOIN ordenes_produccion op ON k.referencia_tipo = 'orden' AND k.referencia_id = op.id
      WHERE k.referencia_tipo = 'orden' AND k.referencia_id = ?
      ORDER BY k.fecha DESC, k.id DESC`,
      [ordenId]
    );

    // Obtener prendas de la orden
    const [prendas] = await db.execute(
      `SELECT
        oi.*,
        p.nombre as prenda_nombre,
        p.codigo as prenda_codigo
      FROM ordenes_items oi
      INNER JOIN prendas p ON oi.prenda_id = p.id
      WHERE oi.orden_id = ?
      ORDER BY oi.id`,
      [ordenId]
    );

    // Obtener consumos agrupados
    const [consumos] = await db.execute(
      `SELECT
        oc.*,
        mp.nombre as materia_nombre,
        mp.unidad_base
      FROM orden_consumos oc
      INNER JOIN materias_primas mp ON oc.materia_prima_id = mp.id
      WHERE oc.orden_id = ?
      ORDER BY oc.id`,
      [ordenId]
    );

    res.json({
      success: true,
      data: {
        movimientos: movimientos,
        prendas: prendas,
        consumos_agrupados: consumos,
        resumen: {
          total_movimientos: movimientos.length,
          total_prendas: prendas.length,
          costo_total: movimientos.reduce((sum, mov) => sum + (parseFloat(mov.cantidad) * parseFloat(mov.lote_costo_unitario)), 0)
        }
      }
    });
  } catch (error) {
    console.error('Error en getMovimientosByOrden:', error);
    res.status(500).json({ success: false, message: error.message });
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

