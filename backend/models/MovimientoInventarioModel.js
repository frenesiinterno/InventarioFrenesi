const db = require('../database/db');

class MovimientoInventarioModel {
  // Obtener todos los movimientos
  static async getAll() {
    const query = `
      SELECT 
        mi.*,
        mp.codigo as materia_codigo,
        mp.nombre as materia_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre,
        op.numero_orden
      FROM movimientos_inventario mi
      INNER JOIN materia_prima mp ON mi.materia_prima_id = mp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN ordenes_produccion op ON mi.orden_produccion_id = op.id
      ORDER BY mi.created_at DESC
      LIMIT 1000
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener movimientos por materia prima
  static async getByMateriaPrima(materiaPrimaId) {
    const query = `
      SELECT 
        mi.*,
        mp.codigo as materia_codigo,
        mp.nombre as materia_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre,
        op.numero_orden
      FROM movimientos_inventario mi
      INNER JOIN materia_prima mp ON mi.materia_prima_id = mp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN ordenes_produccion op ON mi.orden_produccion_id = op.id
      WHERE mi.materia_prima_id = ?
      ORDER BY mi.created_at DESC
    `;
    const [rows] = await db.execute(query, [materiaPrimaId]);
    return rows;
  }

  // Crear movimiento
  static async create(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Crear movimiento
      const query = `
        INSERT INTO movimientos_inventario 
        (materia_prima_id, tipo_movimiento, cantidad, orden_produccion_id, motivo, observaciones)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = await connection.execute(query, [
        data.materia_prima_id,
        data.tipo_movimiento,
        data.cantidad,
        data.orden_produccion_id || null,
        data.motivo || null,
        data.observaciones || null
      ]);

      // Actualizar stock según tipo de movimiento
      const cantidadAjuste = data.tipo_movimiento === 'entrada' 
        ? data.cantidad 
        : (data.tipo_movimiento === 'salida' ? -data.cantidad : 0);

      if (data.tipo_movimiento === 'ajuste') {
        // Para ajustes, establecer el stock directamente
        await connection.execute(
          `UPDATE materia_prima SET stock_actual = ? WHERE id = ?`,
          [data.cantidad, data.materia_prima_id]
        );
      } else if (cantidadAjuste !== 0) {
        await connection.execute(
          `UPDATE materia_prima 
           SET stock_actual = stock_actual + ? 
           WHERE id = ?`,
          [cantidadAjuste, data.materia_prima_id]
        );
      }

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = MovimientoInventarioModel;

