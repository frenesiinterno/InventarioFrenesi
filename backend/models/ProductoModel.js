const db = require('../database/db');

class ProductoModel {
  // Obtener todos los productos
  static async getAll() {
    const query = `
      SELECT * FROM productos 
      WHERE activo = 1 
      ORDER BY nombre
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener producto por ID
  static async getById(id) {
    const query = `SELECT * FROM productos WHERE id = ? AND activo = 1`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  static async getStockBajo() {

    const query = `SELECT * FROM productos WHERE stock < stock_minimo`
    const [rows] = await db.execute(query)
    const productos = rows.map(map)
    return 
  }

  static async getByNombre(nombre) {
    const query = `SELECT * FROM productos WHERE nombre = ? AND activo = 1 LIMIT 1`;
    const [rows] = await db.execute(query, [nombre]);
    return rows[0];
  }

  static async findOrCreateByNombre(nombre, data = {}) {
    const existing = await this.getByNombre(nombre);
    if (existing) {
      return existing;
    }
    const id = await this.create({
      codigo: data.codigo || null,
      nombre,
      descripcion: data.descripcion || null
    });
    return { id, nombre, codigo: data.codigo || null, descripcion: data.descripcion || null };
  }

  // Crear nuevo producto
  static async create(data) {
    const query = `
      INSERT INTO productos (codigo, nombre, descripcion)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.codigo || null,
      data.nombre,
      data.descripcion || null
    ]);
    return result.insertId;
  }

  // Actualizar producto
  static async update(id, data) {
    const query = `
      UPDATE productos 
      SET codigo = ?, nombre = ?, descripcion = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [
      data.codigo || null,
      data.nombre,
      data.descripcion || null,
      id
    ]);
    return result.affectedRows > 0;
  }

  // Eliminar producto (soft delete)
  static async delete(id) {
    const query = `UPDATE productos SET activo = 0 WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }
  // Obtener productos más costosos (Top 5)
  static async getTopCostosos() {
    const query = `
      SELECT p.nombre as name, ROUND(SUM(ft.cantidad * ft.precio_unitario), 2) as costo
      FROM productos p
      JOIN fichas_tecnicas ft ON p.id = ft.producto_id
      WHERE p.activo = 1
      GROUP BY p.id, p.nombre
      ORDER BY costo DESC
      LIMIT 5
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

}

module.exports = ProductoModel;

