const db = require('../database/db');

class FichaTecnicaModel {
  // Obtener ficha técnica completa de una prenda (solo consumo)
  static async getByPrenda(prendaId) {
    const query = `
      SELECT 
        ft.id,
        ft.prenda_id as producto_id,
        ft.materia_prima_id,
        ft.consumo as cantidad,
        NULL as materia_codigo,
        mp.nombre as materia_nombre,
        COALESCE(um.codigo, mp.unidad_base, 'UND') as unidad_codigo,
        COALESCE(um.nombre, mp.unidad_base, 'Unidad') as unidad_nombre,
        COALESCE(tmp.nombre, 'OTROS') as tipo_nombre
      FROM fichas_tecnicas ft
      INNER JOIN materias_primas mp ON ft.materia_prima_id = mp.id
      LEFT JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      WHERE ft.prenda_id = ?
      ORDER BY tmp.nombre, mp.nombre
    `;
    const [rows] = await db.execute(query, [prendaId]);
    return rows;
  }

  // Obtener resumen de ficha técnica con totales por tipo (si existe tipo)
  static async getResumenByPrenda(prendaId) {
    const query = `
      SELECT 
        COALESCE(tmp.nombre, 'OTROS') as tipo,
        COUNT(*) as cantidad_items,
        SUM(ft.consumo) as cantidad_total
      FROM fichas_tecnicas ft
      INNER JOIN materias_primas mp ON ft.materia_prima_id = mp.id
      LEFT JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      WHERE ft.prenda_id = ?
      GROUP BY tmp.id, tmp.nombre
      ORDER BY tmp.nombre
    `;
    const [rows] = await db.execute(query, [prendaId]);
    return rows;
  }

  // Obtener total general de una prenda (solo cantidad total)
  static async getTotalByPrenda(prendaId) {
    const query = `
      SELECT 
        SUM(ft.consumo) as cantidad_total
      FROM fichas_tecnicas ft
      WHERE ft.prenda_id = ?
    `;
    const [rows] = await db.execute(query, [prendaId]);
    return rows[0] || { cantidad_total: 0 };
  }

  // Agregar materia prima a ficha técnica (usar esquema actual: prenda_id, materia_prima_id, consumo, unidad)
  static async create(data) {
    const query = `
      INSERT INTO fichas_tecnicas (prenda_id, materia_prima_id, consumo, unidad)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE consumo = VALUES(consumo), unidad = VALUES(unidad)
    `;
    const [result] = await db.execute(query, [
      data.prenda_id,
      data.materia_prima_id,
      data.consumo,
      data.unidad || null
    ]);
    return result.insertId;
  }

  // Actualizar consumo en ficha técnica
  static async update(id, data) {
    if (data.consumo === undefined) {
      return false;
    }

    const query = `UPDATE fichas_tecnicas SET consumo = ? WHERE id = ?`;
    const [result] = await db.execute(query, [data.consumo, id]);
    return result.affectedRows > 0;
  }

  // Eliminar materia prima de ficha técnica
  static async delete(id) {
    const query = `DELETE FROM fichas_tecnicas WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Eliminar todas las materias primas de una prenda
  static async deleteByPrenda(prendaId) {
    const query = `DELETE FROM fichas_tecnicas WHERE prenda_id = ?`;
    const [result] = await db.execute(query, [prendaId]);
    return result.affectedRows > 0;
  }
}

module.exports = FichaTecnicaModel;

