const MovimientoInventarioModel = require('../models/MovimientoInventarioModel');
const MateriaPrimaModel = require('../models/MateriaPrimaModel');
const KardexModel = require('../models/KardexModel');
const CompraModel = require('../models/CompraModel');
const db = require('../database/db');

const parseDecimal = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Obtener todos los movimientos (ahora desde Kardex y compras)
exports.getMovimientos = async (req, res) => {
  try {
    const { limit = 500 } = req.query;
    
    // Obtener movimientos del Kardex
    const query = `
      SELECT 
        k.*,
        mp.codigo as materia_codigo,
        mp.nombre as materia_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre,
        op.numero_orden,
        c.numero_factura,
        c.proveedor_nombre as compra_proveedor_nombre,
        p.nombre as proveedor_nombre_registrado
      FROM kardex_movimientos k
      INNER JOIN materias_primas mp ON k.materia_prima_id = mp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN ordenes_produccion op ON k.referencia = 'OP' AND k.referencia_id = op.id
      LEFT JOIN compras c ON k.compra_id = c.id
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      ORDER BY k.fecha DESC, k.id DESC
      LIMIT ${parseInt(limit)}
    `;
    
    const db = require('../database/db');
    const [rows] = await db.execute(query);
    
    // Formatear para compatibilidad con el frontend
    const movimientos = rows.map(row => ({
      id: row.id,
      tipo_movimiento: row.tipo.toLowerCase(),
      materia_prima_id: row.materia_prima_id,
      materia_codigo: row.materia_codigo,
      materia_nombre: row.materia_nombre,
      unidad_codigo: row.unidad_codigo,
      unidad_nombre: row.unidad_nombre,
      cantidad: row.cantidad,
      costo_unitario: row.costo_unitario,
      numero_orden: row.numero_orden,
      motivo: row.motivo,
      observaciones: row.observaciones,
      created_at: row.fecha,
      numero_factura: row.numero_factura,
      proveedor_nombre: row.proveedor_nombre_registrado || row.compra_proveedor_nombre
    }));
    
    res.json({ success: true, data: movimientos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener movimientos por materia prima
exports.getMovimientosByMateria = async (req, res) => {
  try {
    const { materiaPrimaId } = req.params;
    const movimientos = await MovimientoInventarioModel.getByMateriaPrima(materiaPrimaId);
    res.json({ success: true, data: movimientos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear movimiento manual (ahora usa Kardex)
exports.createMovimiento = async (req, res) => {
  try {
    const { materia_prima_id, tipo_movimiento, cantidad, costo_unitario, motivo, observaciones } = req.body;

    if (!materia_prima_id || !tipo_movimiento || cantidad === undefined || cantidad === null || cantidad === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan campos requeridos: materia_prima_id, tipo_movimiento, cantidad' 
      });
    }

    if (!['entrada', 'salida', 'ajuste'].includes(tipo_movimiento)) {
      return res.status(400).json({ 
        success: false, 
        message: 'tipo_movimiento debe ser: entrada, salida o ajuste' 
      });
    }

    const cantidadNumerica = parseDecimal(cantidad);

    if (cantidadNumerica <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un valor positivo mayor a cero'
      });
    }

    let movimientoId;
    let referencia = 'OTRO';

    // Usar Kardex para registrar movimientos con costos
    if (tipo_movimiento === 'entrada') {
      // Para entradas, el costo_unitario es obligatorio
      const costoUnitario = parseDecimal(costo_unitario);
      if (costoUnitario <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Para entradas, el costo_unitario es obligatorio y debe ser mayor a cero'
        });
      }

      referencia = 'COMPRA';
      movimientoId = await KardexModel.registrarEntrada({
        materia_prima_id,
        cantidad: cantidadNumerica,
        costo_unitario: costoUnitario,
        referencia: referencia,
        motivo: motivo || 'Entrada manual de inventario',
        observaciones: observaciones || null
      });
    } else if (tipo_movimiento === 'salida') {
      // Para salidas, usar PEPS (no necesita costo_unitario, se calcula automáticamente)
      referencia = 'MERMA';
      const resultado = await KardexModel.registrarSalida({
        materia_prima_id,
        cantidad: cantidadNumerica,
        referencia: referencia,
        motivo: motivo || 'Salida manual de inventario',
        observaciones: observaciones || null
      });
      movimientoId = resultado.movimiento_id;
    } else {
      // Para ajustes, usar el sistema antiguo (no tiene costo)
      movimientoId = await MovimientoInventarioModel.create({
        materia_prima_id,
        tipo_movimiento: 'ajuste',
        cantidad: cantidadNumerica,
        motivo: motivo || null,
        observaciones: observaciones || null
      });
    }

    res.status(201).json({ 
      success: true, 
      data: { id: movimientoId }, 
      message: 'Movimiento registrado exitosamente en el Kardex' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener resumen de inventario
exports.getResumen = async (req, res) => {
  try {
    const materias = await MateriaPrimaModel.getAll();

    // Valor total inventario debe salir del Kardex (saldo_costo), no de materia's precio_unitario
    // Sumamos el último saldo_costo por materia_prima_id en una sola consulta.
    const [valorRows] = await db.execute(
      `
      SELECT COALESCE(SUM(k.saldo_costo), 0) AS valor_total
      FROM kardex_movimientos k
      INNER JOIN (
        SELECT materia_prima_id, MAX(id) AS last_id
        FROM kardex_movimientos
        GROUP BY materia_prima_id
      ) last_k ON last_k.last_id = k.id
      `
    );
    const valorTotalInventario = parseDecimal(valorRows?.[0]?.valor_total || 0);

    const resumen = {
      total_materias: materias.length,
      materias_stock_bajo: materias.filter(m => parseDecimal(m.stock_actual) <= parseDecimal(m.stock_minimo)).length,
      valor_total_inventario: valorTotalInventario
    };
    res.json({ success: true, data: resumen });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

