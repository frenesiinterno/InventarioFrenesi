const db = require('../database/db');

class OrdenProduccionModel {
  // Obtener todas las órdenes
  static async getAll() {
    const query = `
      SELECT 
        op.*,
        p.codigo as producto_codigo,
        p.nombre as producto_nombre,
        (SELECT COUNT(*) FROM op_items WHERE orden_produccion_id = op.id) as total_items
      FROM ordenes_produccion op
      LEFT JOIN productos p ON op.producto_id = p.id
      ORDER BY op.fecha_orden DESC, op.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener orden por ID
  static async getById(id) {
    const query = `
      SELECT 
        op.*,
        p.codigo as producto_codigo,
        p.nombre as producto_nombre
      FROM ordenes_produccion op
      LEFT JOIN productos p ON op.producto_id = p.id
      WHERE op.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  // Obtener orden por número de orden
  static async getByNumeroOrden(numeroOrden) {
    const query = `
      SELECT * FROM ordenes_produccion 
      WHERE numero_orden = ?
    `;
    const [rows] = await db.execute(query, [numeroOrden]);
    return rows[0] || null;
  }

  // Crear nueva orden
  static async create(data) {
    const query = `
      INSERT INTO ordenes_produccion 
      (numero_orden, producto_id, cantidad_producir, fecha_orden, estado, observaciones, siigo_oc_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.numero_orden,
      data.producto_id || null,
      data.cantidad_producir || 0,
      data.fecha_orden,
      data.estado || 'pendiente',
      data.observaciones || null,
      data.siigo_oc_id || null
    ]);
    return result.insertId;
  }

  // Actualizar orden
  static async update(id, data) {
    const updates = [];
    const values = [];

    if (data.numero_orden !== undefined) {
      updates.push('numero_orden = ?');
      values.push(data.numero_orden);
    }
    if (data.producto_id !== undefined) {
      updates.push('producto_id = ?');
      values.push(data.producto_id);
    }
    if (data.cantidad_producir !== undefined) {
      updates.push('cantidad_producir = ?');
      values.push(data.cantidad_producir);
    }
    if (data.fecha_orden !== undefined) {
      updates.push('fecha_orden = ?');
      values.push(data.fecha_orden);
    }
    if (data.estado !== undefined) {
      updates.push('estado = ?');
      values.push(data.estado);
    }
    if (data.observaciones !== undefined) {
      updates.push('observaciones = ?');
      values.push(data.observaciones);
    }

    if (updates.length === 0) return false;

    values.push(id);
    const query = `UPDATE ordenes_produccion SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await db.execute(query, values);
    return result.affectedRows > 0;
  }

  // Eliminar orden
  static async delete(id) {
    const query = `DELETE FROM ordenes_produccion WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Procesar orden (descontar materiales usando Kardex)
  static async procesarOrden(id) {
    const OpItemModel = require('./OpItemModel');
    const KardexModel = require('./KardexModel');

    try {
      // Obtener orden
      const orden = await this.getById(id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      // Obtener items de la orden
      const items = await OpItemModel.getByOrdenId(id);

      if (!items || items.length === 0) {
        // Si no hay items, usar el método anterior (compatibilidad con órdenes antiguas)
        if (!orden.producto_id) {
          throw new Error('La orden no tiene productos asociados para procesar');
        }

        // Obtener ficha técnica del producto
        const FichaTecnicaModel = require('./FichaTecnicaModel');
        const fichaRows = await FichaTecnicaModel.getByProducto(orden.producto_id);

        // Descontar materiales usando Kardex (PEPS)
        for (const item of fichaRows) {
          const cantidadDescontar = item.cantidad * orden.cantidad_producir;

          // Registrar salida en Kardex (maneja PEPS, actualiza stock y maneja su propia transacción)
          await KardexModel.registrarSalida({
            materia_prima_id: item.materia_prima_id,
            cantidad: cantidadDescontar,
            referencia: 'OP',
            referencia_id: id,
            motivo: 'Orden de producción',
            observaciones: `Orden: ${orden.numero_orden}`
          });
        }
      } else {
        // Procesar cada item de la orden
        for (const item of items) {
          let productoId = item.producto_id;

          if (!productoId) {
            // Si el item no tiene producto, usar el de la orden (fallback)
            if (orden.producto_id) {
              productoId = orden.producto_id;
            } else {
              console.warn(`Item ${item.id} no tiene producto asignado, se omite del procesamiento`);
              continue;
            }
          }

          // Obtener ficha técnica del producto del item
          const FichaTecnicaModel = require('./FichaTecnicaModel');
          const fichaRows = await FichaTecnicaModel.getByProducto(productoId);

          // Descontar materiales según la cantidad del item usando Kardex
          for (const ficha of fichaRows) {
            const cantidadDescontar = ficha.cantidad * item.cantidad;

            // Registrar salida en Kardex (maneja PEPS, actualiza stock y maneja su propia transacción)
            await KardexModel.registrarSalida({
              materia_prima_id: ficha.materia_prima_id,
              cantidad: cantidadDescontar,
              referencia: 'OP',
              referencia_id: id,
              motivo: 'Orden de producción',
              observaciones: `Item: ${item.referencia_prenda} (${item.cantidad} unidades)`
            });
          }
        }
      }

      // Actualizar estado de orden (sin transacción ya que KardexModel maneja las suyas)
      await this.update(id, { estado: 'completada' });

      return true;
    } catch (error) {
      throw error;
    }
  }
}


module.exports = OrdenProduccionModel;

