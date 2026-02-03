const db = require('../database/db');
const KardexModel = require('./KardexModel');

class CompraModel {
  // Obtener todas las compras
  static async getAll() {
    const query = `
      SELECT 
        c.*,
        p.nombre as proveedor_nombre_registrado,
        COUNT(ci.id) as total_items,
        SUM(ci.subtotal) as total_calculado
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN compra_items ci ON c.id = ci.compra_id
      GROUP BY c.id
      ORDER BY c.fecha_compra DESC, c.created_at DESC
      LIMIT 500
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener compra por ID con items
  static async getById(id) {
    const connection = await db.getConnection();
    try {
      // Obtener compra
      const [compras] = await connection.execute(
        `SELECT 
          c.*,
          p.nombre as proveedor_nombre_registrado,
          p.nit as proveedor_nit,
          p.telefono as proveedor_telefono
         FROM compras c
         LEFT JOIN proveedores p ON c.proveedor_id = p.id
         WHERE c.id = ?`,
        [id]
      );

      if (compras.length === 0) return null;

      const compra = compras[0];

      // Obtener items de la compra
      const [items] = await connection.execute(
        `SELECT 
          ci.*,
          mp.nombre as materia_nombre,
          mp.codigo as materia_codigo,
          um.nombre as unidad_nombre,
          um.codigo as unidad_codigo
         FROM compra_items ci
         INNER JOIN materias_primas mp ON ci.materia_prima_id = mp.id
         INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
         WHERE ci.compra_id = ?
         ORDER BY ci.id`,
        [id]
      );

      compra.items = items;
      return compra;
    } finally {
      connection.release();
    }
  }

  // Crear compra con múltiples items
  static async create(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Calcular total
      const total = data.items.reduce((sum, item) => {
        return sum + (parseFloat(item.cantidad) * parseFloat(item.costo_unitario));
      }, 0);

      // Crear compra
      const [compraResult] = await connection.execute(
        `INSERT INTO compras 
         (proveedor_id, proveedor_nombre, numero_factura, fecha_compra, fecha_factura, total, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.proveedor_id || null,
          data.proveedor_nombre || null,
          data.numero_factura || null,
          data.fecha_compra || new Date(),
          data.fecha_factura || null,
          total,
          data.observaciones || null
        ]
      );

      const compraId = compraResult.insertId;

      // Crear items y registrar en Kardex
      for (const item of data.items) {
        // Crear item de compra
        const [itemResult] = await connection.execute(
          `INSERT INTO compra_items 
           (compra_id, materia_prima_id, cantidad, costo_unitario, subtotal, observaciones)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            compraId,
            item.materia_prima_id,
            parseFloat(item.cantidad),
            parseFloat(item.costo_unitario),
            parseFloat(item.cantidad) * parseFloat(item.costo_unitario),
            item.observaciones || null
          ]
        );

        // Registrar entrada en Kardex
        await KardexModel.registrarEntrada({
          materia_prima_id: item.materia_prima_id,
          cantidad: parseFloat(item.cantidad),
          costo_unitario: parseFloat(item.costo_unitario),
          referencia: 'COMPRA',
          referencia_id: compraId,
          motivo: `Compra ${data.numero_factura ? `Factura ${data.numero_factura}` : ''}`,
          observaciones: item.observaciones || null
        });
      }

      // Actualizar total de la compra
      await connection.execute(
        `UPDATE compras SET total = ? WHERE id = ?`,
        [total, compraId]
      );

      await connection.commit();
      return compraId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Eliminar compra (y revertir movimientos del Kardex si es necesario)
  static async delete(id) {
    // Nota: Por ahora solo eliminamos la compra, los movimientos del Kardex se mantienen
    // En el futuro se podría implementar reversión
    const query = `DELETE FROM compras WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = CompraModel;

