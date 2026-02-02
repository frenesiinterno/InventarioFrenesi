const db = require('../database/db');

class UnidadMedidaModel {
  static async getAll() {
    const query = `
      SELECT 
        id,
        codigo,
        nombre,
        descripcion
      FROM unidades_medida
      ORDER BY nombre
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

 

  static async getByCodigo(codigo) {
    const query = `SELECT * FROM unidades_medida WHERE codigo = ?`;
    const [rows] = await db.execute(query, [codigo]);
    return rows[0];
  }

  static async create(data) {
    const query = `
      INSERT INTO unidades_medida (codigo, nombre, descripcion)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nombre = VALUES(nombre),
        descripcion = VALUES(descripcion)
    `;
    const [result] = await db.execute(query, [
      data.codigo,
      data.nombre,
      data.descripcion || null
    ]);
    return result.insertId;
  }
}

module.exports = UnidadMedidaModel;


