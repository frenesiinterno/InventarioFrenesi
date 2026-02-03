const db = require('../database/db');

class ProveedorModel {
  // Obtener todos los proveedores activos
  static async getAll() {
    const query = `
      SELECT * FROM proveedores 
      WHERE activo = 1 
      ORDER BY nombre
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener todos los proveedores (incluyendo inactivos)
  static async getAllIncludingInactive() {
    const query = `
      SELECT * FROM proveedores 
      ORDER BY nombre
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  static async getAllIncludingInactive() {
    const query = ` SELECT * FROM proveedores
    ORDER BY nombre`;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener proveedor por ID
  static async getById(id) {
    const query = `SELECT * FROM proveedores WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  // Crear proveedor
  static async create(data) {
    const query = `
      INSERT INTO proveedores 
      (nombre, nit, telefono, email, direccion, contacto, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.nombre,      
      data.nit || null,
      data.telefono || null,
      data.email || null,
      data.direccion || null,
      data.contacto || null,
      data.observaciones || null
    ]);
    return result.insertId;
  }

  // Actualizar proveedor
  static async update(id, data) {
    const query = `
      UPDATE proveedores 
      SET nombre = ?, nit = ?, telefono = ?, email = ?, 
          direccion = ?, contacto = ?, observaciones = ?, activo = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [
      data.nombre,
      data.nit || null,
      data.telefono || null,
      data.email || null,
      data.direccion || null,
      data.contacto || null,
      data.observaciones || null,
      data.activo !== undefined ? data.activo : 1,
      id
    ]);
    return result.affectedRows > 0;
  }

  // Eliminar proveedor (soft delete)
  static async delete(id) {
    const query = `UPDATE proveedores SET activo = 0 WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Obtener compras de un proveedor
  static async getComprasByProveedor(proveedorId) {
    const query = `
      SELECT 
        c.*,
        COUNT(ci.id) as total_items,
        SUM(ci.subtotal) as total_calculado
      FROM compras c
      LEFT JOIN compra_items ci ON c.id = ci.compra_id
      WHERE c.proveedor_id = ?
      GROUP BY c.id
      ORDER BY c.fecha_compra DESC, c.created_at DESC
    `;
    const [rows] = await db.execute(query, [proveedorId]);
    return rows;
  }
}

module.exports = ProveedorModel;

