const db = require('../database/db');

class FichaTecnicaModel {
  // Obtener ficha técnica completa de un producto (solo consumo, sin costos)
  static async getByProducto(productoId) {
    const query = `
      SELECT 
        ft.id,
        ft.producto_id,
        ft.materia_prima_id,
        ft.cantidad,
        mp.codigo as materia_codigo,
        mp.nombre as materia_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre,
        tmp.nombre as tipo_nombre
      FROM fichas_tecnicas ft
      INNER JOIN materia_prima mp ON ft.materia_prima_id = mp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      INNER JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      WHERE ft.producto_id = ?
      ORDER BY tmp.nombre, mp.nombre
    `;
    const [rows] = await db.execute(query, [productoId]);
    return rows;
  }

  // Obtener resumen de ficha técnica con totales por tipo (solo cantidades)
  static async getResumenByProducto(productoId) {
    const query = `
      SELECT 
        tmp.nombre as tipo,
        COUNT(*) as cantidad_items,
        SUM(ft.cantidad) as cantidad_total
      FROM fichas_tecnicas ft
      INNER JOIN materia_prima mp ON ft.materia_prima_id = mp.id
      INNER JOIN tipos_materia_prima tmp ON mp.tipo_id = tmp.id
      WHERE ft.producto_id = ?
      GROUP BY tmp.id, tmp.nombre
      ORDER BY tmp.nombre
    `;
    const [rows] = await db.execute(query, [productoId]);
    return rows;
  }

  // Obtener total general de un producto (solo cantidad total)
  static async getTotalByProducto(productoId) {
    const query = `
      SELECT 
        SUM(ft.cantidad) as cantidad_total
      FROM fichas_tecnicas ft
      WHERE ft.producto_id = ?
    `;
    const [rows] = await db.execute(query, [productoId]);
    return rows[0] || { cantidad_total: 0 };
  }

  // Agregar materia prima a ficha técnica (solo consumo)
  static async create(data) {
    const query = `
      INSERT INTO fichas_tecnicas (producto_id, materia_prima_id, cantidad)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE cantidad = ?
    `;
    const [result] = await db.execute(query, [
      data.producto_id,
      data.materia_prima_id,
      data.cantidad,
      data.cantidad
    ]);
    return result.insertId;
  }

  // Actualizar cantidad en ficha técnica
  static async update(id, data) {
    if (data.cantidad === undefined) {
      return false;
    }

    const query = `UPDATE fichas_tecnicas SET cantidad = ? WHERE id = ?`;
    const [result] = await db.execute(query, [data.cantidad, id]);
    return result.affectedRows > 0;
  }

  // Eliminar materia prima de ficha técnica
  static async delete(id) {
    const query = `DELETE FROM fichas_tecnicas WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Eliminar todas las materias primas de un producto
  static async deleteByProducto(productoId) {
    const query = `DELETE FROM fichas_tecnicas WHERE producto_id = ?`;
    const [result] = await db.execute(query, [productoId]);
    return result.affectedRows > 0;
  }
}

module.exports = FichaTecnicaModel;

