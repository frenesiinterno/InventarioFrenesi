const db = require('../database/db');

class MateriaPrimaModel {
  static async getByNombre(nombre) {
    const query = `
      SELECT mp.*, COALESCE(um.nombre, mp.unidad_base, 'Unidad') as unidad_nombre, COALESCE(um.codigo, NULL) as unidad_codigo, COALESCE(tmp.nombre, NULL) as tipo_nombre
      FROM materias_primas mp
      LEFT JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      WHERE mp.nombre = ? AND mp.activo = 1
      LIMIT 1
    `;
    const [rows] = await db.execute(query, [nombre]);
    return rows[0];
  }

  // Obtener todas las materias primas con stock disponible (calculado desde lotes)
  static async getAll() {
    const query = `
      SELECT
        mp.*, 
        COALESCE(um.nombre, mp.unidad_base, 'Unidad') as unidad_nombre,
        COALESCE(um.codigo, NULL) as unidad_codigo,
        COALESCE(tmp.nombre, NULL) as tipo_nombre,
        COALESCE(SUM(lmp.cantidad_disponible), 0) as stock_disponible,
        COALESCE(AVG(lmp.costo_unitario), 0) as costo_promedio_ponderado
      FROM materias_primas mp
      LEFT JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      LEFT JOIN lotes_materia_prima lmp ON mp.id = lmp.materia_prima_id
      WHERE mp.activo = 1
      GROUP BY mp.id
      ORDER BY mp.nombre
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener materia prima por ID
  static async getById(id) {
    const query = `
      SELECT
        mp.*, 
        COALESCE(um.nombre, mp.unidad_base, 'Unidad') as unidad_nombre,
        COALESCE(um.codigo, NULL) as unidad_codigo,
        COALESCE(tmp.nombre, NULL) as tipo_nombre,
        COALESCE(SUM(lmp.cantidad_disponible), 0) as stock_disponible,
        COALESCE(AVG(lmp.costo_unitario), 0) as costo_promedio_ponderado
      FROM materias_primas mp
      LEFT JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      LEFT JOIN lotes_materia_prima lmp ON mp.id = lmp.materia_prima_id
      WHERE mp.id = ? AND mp.activo = 1
      GROUP BY mp.id
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  // Crear nueva materia prima (ahora con tipo_id, unidad_medida_id y precio_unitario opcionales)
  static async create(data) {
    const query = `
      INSERT INTO materias_primas
      (nombre, unidad_base, stock_minimo, activo, tipo_id, unidad_medida_id, precio_unitario)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.nombre,
      data.unidad_base || 'unidad',
      data.stock_minimo ?? 0,
      data.activo ?? true,
      data.tipo_id || null,
      data.unidad_medida_id || null,
      data.precio_unitario ?? 0
    ]);
    return result.insertId;
  }

  // Actualizar materia prima (agregadas columnas tipo_id, unidad_medida_id, precio_unitario)
  static async update(id, data) {
    const query = `
      UPDATE materias_primas
      SET nombre = ?, unidad_base = ?, stock_minimo = ?, activo = ?, tipo_id = ?, unidad_medida_id = ?, precio_unitario = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [
      data.nombre,
      data.unidad_base || 'unidad',
      data.stock_minimo ?? 0,
      data.activo ?? true,
      data.tipo_id || null,
      data.unidad_medida_id || null,
      data.precio_unitario ?? 0,
      id
    ]);
    return result.affectedRows > 0;
  }

  // Eliminar materia prima (soft delete)
  static async delete(id) {
    const query = `UPDATE materias_primas SET activo = 0 WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Obtener stock disponible de una materia prima (suma de lotes)
  static async getStockDisponible(materiaPrimaId) {
    const query = `
      SELECT COALESCE(SUM(cantidad_disponible), 0) as stock_disponible
      FROM lotes_materia_prima
      WHERE materia_prima_id = ?
    `;
    const [rows] = await db.execute(query, [materiaPrimaId]);
    return parseFloat(rows[0]?.stock_disponible || 0);
  }

  // Obtener costo promedio ponderado de una materia prima
  static async getCostoPromedioPonderado(materiaPrimaId) {
    const query = `
      SELECT
        SUM(cantidad_disponible * costo_unitario) / NULLIF(SUM(cantidad_disponible), 0) as costo_promedio
      FROM lotes_materia_prima
      WHERE materia_prima_id = ? AND cantidad_disponible > 0
    `;
    const [rows] = await db.execute(query, [materiaPrimaId]);
    return parseFloat(rows[0]?.costo_promedio || 0);
  }

  // Obtener materias primas con stock bajo
  static async getStockBajo() {
    const query = `
      SELECT
        mp.*,
        COALESCE(SUM(lmp.cantidad_disponible), 0) as stock_disponible
      FROM materias_primas mp
      LEFT JOIN lotes_materia_prima lmp ON mp.id = lmp.materia_prima_id
      WHERE mp.activo = 1
      GROUP BY mp.id
      HAVING stock_disponible <= mp.stock_minimo
      ORDER BY (stock_disponible / NULLIF(mp.stock_minimo, 0)) ASC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener lotes disponibles de una materia prima (para PEPS)
  static async getLotesDisponibles(materiaPrimaId) {
    const query = `
      SELECT *
      FROM lotes_materia_prima
      WHERE materia_prima_id = ? AND cantidad_disponible > 0
      ORDER BY fecha_ingreso ASC, id ASC
    `;
    const [rows] = await db.execute(query, [materiaPrimaId]);
    return rows;
  }
}

module.exports = MateriaPrimaModel;

