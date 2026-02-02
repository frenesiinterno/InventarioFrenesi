const db = require('../database/db');

class MateriaPrimaModel {
  static async getByNombre(nombre) {
    const query = `
      SELECT 
        mp.*,
        tmp.nombre as tipo_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre
      FROM materia_prima mp
      INNER JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      WHERE mp.nombre = ? AND mp.activo = 1
      LIMIT 1
    `;
    const [rows] = await db.execute(query, [nombre]);
    return rows[0];
  }

  // Obtener todas las materias primas con su tipo y costo promedio del Kardex
  static async getAll() {
    const query = `
      SELECT 
        mp.*,
        tmp.nombre as tipo_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre,
        COALESCE(
          (SELECT saldo_costo / NULLIF(saldo_cantidad, 0)
           FROM kardex_movimientos 
           WHERE materia_prima_id = mp.id 
           ORDER BY fecha DESC, id DESC 
           LIMIT 1),
          0
        ) as costo_promedio_kardex,
        COALESCE(
          (SELECT saldo_cantidad
           FROM kardex_movimientos 
           WHERE materia_prima_id = mp.id 
           ORDER BY fecha DESC, id DESC 
           LIMIT 1),
          mp.stock_actual
        ) as stock_actual_kardex
      FROM materia_prima mp
      INNER JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      WHERE mp.activo = 1
      ORDER BY tmp.nombre, mp.nombre
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener materia prima por ID
  static async getById(id) {
    const query = `
      SELECT 
        mp.*,
        tmp.nombre as tipo_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre
      FROM materia_prima mp
      INNER JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      WHERE mp.id = ? AND mp.activo = 1
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  // Crear nueva materia prima
  static async create(data) {
    const query = `
      INSERT INTO materia_prima 
      (codigo, nombre, tipo_id, unidad_medida_id, precio_unitario, stock_actual, stock_minimo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.codigo || null,
      data.nombre,
      data.tipo_id,
      data.unidad_medida_id,
      data.precio_unitario ?? 0,
      data.stock_actual ?? 0,
      data.stock_minimo ?? 0
    ]);
    return result.insertId;
  }
  
  // Actualizar materia prima
  static async update(id, data) {
    const query = `
      UPDATE materia_prima 
      SET codigo = ?, nombre = ?, tipo_id = ?, unidad_medida_id = ?, 
          precio_unitario = ?, stock_actual = ?, stock_minimo = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [
      data.codigo || null,
      data.nombre,
      data.tipo_id,
      data.unidad_medida_id,
      data.precio_unitario ?? 0,
      data.stock_actual ?? 0,
      data.stock_minimo ?? 0,
      id
    ]);
    return result.affectedRows > 0;
  }

  // Eliminar materia prima (soft delete)
  static async delete(id) {
    const query = `UPDATE materia_prima SET activo = 0 WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Obtener materias primas por tipo
  static async getByTipo(tipoId) {
    const query = `
      SELECT 
        mp.*,
        tmp.nombre as tipo_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre
      FROM materia_prima mp
      INNER JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      WHERE mp.tipo_id = ? AND mp.activo = 1
      ORDER BY mp.nombre
    `;
    const [rows] = await db.execute(query, [tipoId]);
    return rows;
  }

  // Actualizar stock de materia prima
  static async updateStock(id, cantidad) {
    const query = `
      UPDATE materia_prima 
      SET stock_actual = stock_actual + ?
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [cantidad, id]);
    return result.affectedRows > 0;
  }

  // Obtener materias primas con stock bajo
  static async getStockBajo() {
    const query = `
      SELECT 
        mp.*,
        tmp.nombre as tipo_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre
      FROM materia_prima mp
      INNER JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      WHERE mp.activo = 1 AND mp.stock_actual <= mp.stock_minimo
      ORDER BY (mp.stock_actual / NULLIF(mp.stock_minimo, 0)) ASC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }
}

module.exports = MateriaPrimaModel;

