const db = require('../database/db');

class OpItemModel {
  // Obtener todos los items de una orden
  static async getByOrdenId(ordenId) {
    const query = `
      SELECT 
        oi.*,
        p.codigo as producto_codigo,
        p.nombre as producto_nombre,
        ps.codigo as producto_sugerido_codigo,
        ps.nombre as producto_sugerido_nombre
      FROM op_items oi
      LEFT JOIN productos p ON oi.producto_id = p.id
      LEFT JOIN productos ps ON oi.producto_sugerido_id = ps.id
      WHERE oi.orden_produccion_id = ?
      ORDER BY oi.id ASC
    `;
    const [rows] = await db.execute(query, [ordenId]);
    return rows;
  }

  // Crear un item
  static async create(data) {
    const query = `
      INSERT INTO op_items 
      (orden_produccion_id, producto_id, referencia_prenda, codigo_item, talla, diseno,
       precio_unitario, cantidad, descuento, total, producto_match_type, 
       producto_sugerido_id, necesita_revision)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.orden_produccion_id,
      data.producto_id || null,
      data.referencia_prenda,
      data.codigo_item || null,
      data.talla || null,
      data.diseno || null,
      data.precio_unitario || null,
      data.cantidad,
      data.descuento || 0,
      data.total || null,
      data.producto_match_type || 'no_encontrado',
      data.producto_sugerido_id || null,
      data.necesita_revision !== undefined ? data.necesita_revision : false
    ]);
    return result.insertId;
  }

  // Crear múltiples items
  static async createMultiple(items) {
    if (!items || items.length === 0) return [];
    const ids = [];
    for (const item of items) {
      const id = await OpItemModel.create(item);
      ids.push(id);
    }
    return ids;
  }

  // Actualizar un item
  static async update(id, data) {
    const updates = [];
    const values = [];

    if (data.producto_id !== undefined) {
      updates.push('producto_id = ?');
      values.push(data.producto_id);
    }
    if (data.referencia_prenda !== undefined) {
      updates.push('referencia_prenda = ?');
      values.push(data.referencia_prenda);
    }
    if (data.talla !== undefined) {
      updates.push('talla = ?');
      values.push(data.talla);
    }
    if (data.diseno !== undefined) {
      updates.push('diseno = ?');
      values.push(data.diseno);
    }
    if (data.precio_unitario !== undefined) {
      updates.push('precio_unitario = ?');
      values.push(data.precio_unitario);
    }
    if (data.cantidad !== undefined) {
      updates.push('cantidad = ?');
      values.push(data.cantidad);
    }
    if (data.descuento !== undefined) {
      updates.push('descuento = ?');
      values.push(data.descuento);
    }
    if (data.total !== undefined) {
      updates.push('total = ?');
      values.push(data.total);
    }

    if (data.producto_match_type !== undefined) {
      updates.push('producto_match_type = ?');
      values.push(data.producto_match_type);
    }

    if (data.necesita_revision !== undefined) {
      updates.push('necesita_revision = ?');
      values.push(data.necesita_revision);
    }

    if (updates.length === 0) return false;
    values.push(id);
    const query = `UPDATE op_items SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await db.execute(query, values);
    return result.affectedRows > 0;
  }

  // Eliminar un item
  static async delete(id) {
    const query = `DELETE FROM op_items WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }



  // Eliminar todos los items de una orden
  static async deleteByOrdenId(ordenId) {
    const query = `DELETE FROM op_items WHERE orden_produccion_id = ?`;
    const [result] = await db.execute(query, [ordenId]);
    return result.affectedRows > 0;
  }

  // Obtener estadísticas de items de una orden
  static async getStatsByOrdenId(ordenId) {
    const query = `
      SELECT 
        COUNT(*) as total_items,
        SUM(cantidad) as cantidad_total,
        SUM(total) as total_precio,
        SUM(CASE WHEN producto_match_type = 'exacto' THEN 1 ELSE 0 END) as items_exactos,
        SUM(CASE WHEN producto_match_type = 'similar' THEN 1 ELSE 0 END) as items_similares,
        SUM(CASE WHEN producto_match_type = 'no_encontrado' THEN 1 ELSE 0 END) as items_no_encontrados,
        SUM(CASE WHEN necesita_revision = 1 THEN 1 ELSE 0 END) as items_revision
      FROM op_items
      WHERE orden_produccion_id = ?
    `;
    const [rows] = await db.execute(query, [ordenId]);
    return rows[0] || null;
  }
      
  // Actualizar costos calculados de un item
  static async actualizarCostosCalculados(id, datos) {
    const query = `
      UPDATE op_items 
      SET 
        costo_materia_prima = ?,
        precio_calculado = ?,
        total_calculado = ?,
        detalles_costos = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [
      datos.costo_materia_prima || 0,
      datos.precio_calculado || 0,
      datos.total_calculado || 0,
      datos.detalles_costos ? JSON.stringify(datos.detalles_costos) : null,
      id
    ]);
    return result.affectedRows > 0;
  }

  // Marcar un item como procesado
  static async marcarComoProcesado(id) {
    const query = `
      UPDATE op_items 
      SET 
        procesado = TRUE,
        fecha_procesamiento = NOW()
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Actualizar ruta de PDF
  static async actualizarRutaPDF(id, rutaPDF) {
    const query = `
      UPDATE op_items 
      SET pdf_ruta = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [rutaPDF, id]);
    return result.affectedRows > 0;
  }

  // Obtener todos los items no procesados de una orden
  static async getNoProceados(ordenId) {
    const query = `
      SELECT * FROM op_items
      WHERE orden_produccion_id = ? AND procesado = FALSE
      ORDER BY id ASC
    `;
    const [rows] = await db.execute(query, [ordenId]);
    return rows;
  }

  // Obtener resumen de costos de una orden
  static async getResumenCostosOrden(ordenId) {
    const query = `
      SELECT 
        COUNT(*) as total_items,
        SUM(cantidad) as cantidad_total,
        SUM(COALESCE(costo_materia_prima, 0)) as costo_total_materia,
        SUM(COALESCE(total_calculado, 0)) as total_calculado,
        SUM(COALESCE(precio_unitario * cantidad, 0)) as total_original,
        SUM(CASE WHEN procesado = 1 THEN 1 ELSE 0 END) as items_procesados
      FROM op_items
      WHERE orden_produccion_id = ?
    `;
    const [rows] = await db.execute(query, [ordenId]);
    return rows[0] || null;
  }
}

module.exports = OpItemModel;

