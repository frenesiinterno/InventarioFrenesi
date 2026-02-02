const db = require('../database/db');

class TipoMateriaPrimaModel {
  // Obtener todos los tipos
  static async getAll() {
    const query = `SELECT * FROM tipos_materia_prima ORDER BY nombre`;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener tipo por ID
  static async getById(id) {
    const query = `SELECT * FROM tipos_materia_prima WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async getByNombre(nombre) {
    const query = `SELECT * FROM tipos_materia_prima WHERE nombre = ?`;
    const [rows] = await db.execute(query, [nombre]);
    return rows[0];
  }

  static async findOrCreate(nombre, descripcion = null) {
    const existing = await this.getByNombre(nombre);
    if (existing) {
      return existing;
    }
    const id = await this.create({ nombre, descripcion });
    return { id, nombre, descripcion };
  }

  // Crear nuevo tipo
  static async create(data) {
    const query = `INSERT INTO tipos_materia_prima (nombre, descripcion) VALUES (?, ?)`;
    const [result] = await db.execute(query, [data.nombre, data.descripcion || null]);
    return result.insertId;
  }

  // Actualizar tipo
  static async update(id, data) {
    const query = `UPDATE tipos_materia_prima SET nombre = ?, descripcion = ? WHERE id = ?`;
    const [result] = await db.execute(query, [data.nombre, data.descripcion || null, id]);
    return result.affectedRows > 0;
  }

  // Eliminar tipo
  static async delete(id) {
    const query = `DELETE FROM tipos_materia_prima WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = TipoMateriaPrimaModel;

