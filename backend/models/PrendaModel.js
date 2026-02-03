const db = require('../database/db');

class PrendaModel {
  static async getByNombre(nombre) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM prendas WHERE UPPER(nombre) = ? AND activo = 1 LIMIT 1',
        [nombre.toUpperCase()]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error en getByNombre:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM prendas WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const { nombre, codigo, activo = true } = data;
      const [result] = await db.execute(
        'INSERT INTO prendas (nombre, codigo, activo) VALUES (?, ?, ?)',
        [nombre, codigo, activo]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error en create:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const { nombre, codigo, activo } = data;
      await db.execute(
        'UPDATE prendas SET nombre = ?, codigo = ?, activo = ? WHERE id = ?',
        [nombre, codigo, activo, id]
      );
      return true;
    } catch (error) {
      console.error('Error en update:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM prendas WHERE activo = 1 ORDER BY nombre'
      );
      return rows;
    } catch (error) {
      console.error('Error en getAll:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.execute(
        'UPDATE prendas SET activo = 0 WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error;
    }
  }
}

module.exports = PrendaModel;
