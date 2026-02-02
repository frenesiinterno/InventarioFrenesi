const db = require('../database/db');

/**
 * Consumo de materia prima por item de orden de producción (trazabilidad PEPS).
 * Cada fila = consumo de una MP para un op_item, con costo_unitario_peps y costo_total.
 */
class OrdenProduccionConsumoMPModel {
  static async create(data) {
    const query = `
      INSERT INTO orden_produccion_consumo_mp
      (orden_produccion_item_id, materia_prima_id, cantidad_consumida, costo_unitario_peps, costo_total)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.orden_produccion_item_id,
      data.materia_prima_id,
      data.cantidad_consumida,
      data.costo_unitario_peps ?? 0,
      data.costo_total ?? 0
    ]);
    return result.insertId;
  }

  /** Usar dentro de una transacción existente */
  static async createWithConnection(connection, data) {
    const query = `
      INSERT INTO orden_produccion_consumo_mp
      (orden_produccion_item_id, materia_prima_id, cantidad_consumida, costo_unitario_peps, costo_total)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute(query, [
      data.orden_produccion_item_id,
      data.materia_prima_id,
      data.cantidad_consumida,
      data.costo_unitario_peps ?? 0,
      data.costo_total ?? 0
    ]);
    return result.insertId;
  }

  static async getByOpItemId(opItemId) {
    const query = `
      SELECT c.*, mp.nombre as materia_nombre, mp.codigo as materia_codigo
      FROM orden_produccion_consumo_mp c
      INNER JOIN materia_prima mp ON c.materia_prima_id = mp.id
      WHERE c.orden_produccion_item_id = ?
      ORDER BY c.id
    `;
    const [rows] = await db.execute(query, [opItemId]);
    return rows;
  }

  static async getByOrdenId(ordenId) {
    const query = `
      SELECT c.*, oi.referencia_prenda, oi.cantidad as item_cantidad,
             mp.nombre as materia_nombre, mp.codigo as materia_codigo
      FROM orden_produccion_consumo_mp c
      INNER JOIN op_items oi ON c.orden_produccion_item_id = oi.id
      INNER JOIN materia_prima mp ON c.materia_prima_id = mp.id
      WHERE oi.orden_produccion_id = ?
      ORDER BY oi.id, c.id
    `;
    const [rows] = await db.execute(query, [ordenId]);
    return rows;
  }
}

module.exports = OrdenProduccionConsumoMPModel;
