const db = require('../database/db');

class SiigoOcModel {
  // Crear orden de compra de SIIGO
  static async create(data) {
    const query = `
      INSERT INTO siigo_ocs 
      (numero_oc, fecha_oc, cliente_nombre, cliente_nit, total_bruto, descuentos, subtotal, total_pagar, pdf_path, pdf_original_name, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.numero_oc,
      data.fecha_oc,
      data.cliente_nombre || null,
      data.cliente_nit || null,
      data.total_bruto || 0,
      data.descuentos || 0,
      data.subtotal || 0,
      data.total_pagar || 0,
      data.pdf_path || null,
      data.pdf_original_name || null,
      data.estado || 'PENDIENTE',
      data.observaciones || null
    ]);
    return result.insertId;
  }

  // Obtener todas las OCs
  static async getAll() {
    const query = `
      SELECT 
        s.*,
        COUNT(DISTINCT si.id) as total_items,
        COUNT(DISTINCT CASE WHEN si.estado = 'PROCESADO' THEN si.id END) as items_procesados
      FROM siigo_ocs s
      LEFT JOIN siigo_oc_items si ON s.id = si.siigo_oc_id
      GROUP BY s.id
      ORDER BY s.fecha_oc DESC, s.created_at DESC
      LIMIT 500
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener OC por ID con items
  static async getById(id) {
    const connection = await db.getConnection();
    try {
      const [ocs] = await connection.execute(
        `SELECT * FROM siigo_ocs WHERE id = ?`,
        [id]
      );

      if (ocs.length === 0) return null;

      const oc = ocs[0];

      const [items] = await connection.execute(
        `SELECT 
          si.id,
          si.siigo_oc_id,
          si.item_numero,
          si.descripcion,
          si.nombre_base,
          si.talla,
          si.\`diseño\` as diseno,
          si.cantidad,
          si.valor_unitario,
          si.valor_total,
          si.ficha_tecnica_id,
          si.orden_produccion_id,
          si.estado,
          si.observaciones,
          si.created_at,
          si.updated_at,
          ft.prenda_id,
          p.nombre as prenda_nombre,
          p.codigo as prenda_codigo
         FROM siigo_oc_items si
         LEFT JOIN fichas_tecnicas ft ON si.ficha_tecnica_id = ft.id
         LEFT JOIN prendas p ON ft.prenda_id = p.id
         WHERE si.siigo_oc_id = ?
         ORDER BY si.item_numero`,
        [id]
      );

      oc.items = items;
      return oc;
    } finally {
      connection.release();
    }
  }

  // Crear item de OC
  static async createItem(data) {
    const query = `
      INSERT INTO siigo_oc_items 
      (siigo_oc_id, item_numero, descripcion, nombre_base, talla, \`diseño\`, cantidad, valor_unitario, valor_total, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.siigo_oc_id,
      data.item_numero,
      data.descripcion,
      data.nombre_base || null,
      data.talla || null,
      data.diseno || null,
      data.cantidad,
      data.valor_unitario || 0,
      data.valor_total || 0,
      data.observaciones || null
    ]);
    return result.insertId;
  }

  // Actualizar item con ficha técnica
  static async asignarFichaTecnica(itemId, fichaTecnicaId) {
    const query = `
      UPDATE siigo_oc_items 
      SET ficha_tecnica_id = ?, estado = 'FICHA_ASIGNADA'
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [fichaTecnicaId, itemId]);
    return result.affectedRows > 0;
  }

  // Actualizar estado de OC
  static async updateEstado(id, estado, observaciones = null) {
    const query = `
      UPDATE siigo_ocs 
      SET estado = ?, observaciones = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [estado, observaciones, id]);
    return result.affectedRows > 0;
  }

  // Actualizar item con orden de producción
  static async asignarOrdenProduccion(itemId, ordenProduccionId) {
    const query = `
      UPDATE siigo_oc_items 
      SET orden_produccion_id = ?, estado = 'PROCESADO'
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [ordenProduccionId, itemId]);
    return result.affectedRows > 0;
  }

  // Validar si una OC se puede eliminar (no debe tener items procesados)
  static async puedeEliminar(ocId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'PROCESADO' OR orden_produccion_id IS NOT NULL THEN 1 ELSE 0 END) as procesados
      FROM siigo_oc_items
      WHERE siigo_oc_id = ?
    `;
    const [rows] = await db.execute(query, [ocId]);
    const row = rows[0] || { total: 0, procesados: 0 };
    return {
      total_items: Number(row.total || 0),
      items_procesados: Number(row.procesados || 0),
      puede_eliminar: Number(row.procesados || 0) === 0
    };
  }

  // Eliminar OC (solo si no tiene items procesados)
  static async deleteById(ocId) {
    const [result] = await db.execute(`DELETE FROM siigo_ocs WHERE id = ?`, [ocId]);
    return result.affectedRows > 0;
  }
}

module.exports = SiigoOcModel;
