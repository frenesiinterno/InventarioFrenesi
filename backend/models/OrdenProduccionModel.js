const db = require('../database/db');

class OrdenProduccionModel {
  // Obtener todas las órdenes
  static async getAll() {
    const query = `
      SELECT
        op.*,
        pr.codigo as prenda_codigo,
        pr.nombre as prenda_nombre,
        (SELECT COUNT(*) FROM ordenes_items WHERE orden_id = op.id) as total_items
      FROM ordenes_produccion op
      LEFT JOIN prendas pr ON op.producto_id = pr.id
      ORDER BY op.fecha DESC, op.created_at DESC
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

  // Obtener orden por código Siigo
  static async getByNumeroOrden(codigoSiigo) {
    const query = `
      SELECT * FROM ordenes_produccion
      WHERE codigo_siigo = ?
    `;
    const [rows] = await db.execute(query, [codigoSiigo]);
    return rows[0] || null;
  }

  // Crear nueva orden
  static async create(data) {
    const query = `
      INSERT INTO ordenes_produccion
      (codigo_siigo, fecha, estado, observaciones)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.numero_orden,
      data.fecha_orden,
      data.estado || 'pendiente',
      data.observaciones || null
    ]);
    return result.insertId;
  }

  // Actualizar orden
  static async update(id, data) {
    const updates = [];
    const values = [];

    if (data.numero_orden !== undefined) {
      updates.push('codigo_siigo = ?');
      values.push(data.numero_orden);
    }
    if (data.fecha_orden !== undefined) {
      updates.push('fecha = ?');
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

  // Procesar orden completa (costear) - siguiendo el alcance funcional
  static async procesarOrden(id) {
    const CostoPrendaService = require('../services/costoPrendaService');
    const KardexModel = require('./KardexModel');

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Obtener orden
      const orden = await this.getById(id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      // Verificar que la orden no esté ya costeada
      if (orden.estado === 'costeada') {
        throw new Error('La orden ya está costeada');
      }

      // Obtener items de la orden
      const OpItemModel = require('./OpItemModel');
      const items = await OpItemModel.getByOrdenId(id);

      if (!items || items.length === 0) {
        throw new Error('La orden no tiene items para procesar');
      }

      // Validar que todos los items tengan prendas asignadas y fichas técnicas
      for (const item of items) {
        if (!item.producto_id) {
          throw new Error(`Item "${item.referencia_prenda}" no tiene prenda asignada`);
        }

        const FichaTecnicaModel = require('./FichaTecnicaModel');
        const fichaTecnica = await FichaTecnicaModel.getByPrendaId(item.producto_id);
        if (!fichaTecnica || fichaTecnica.length === 0) {
          throw new Error(`Prenda "${item.referencia_prenda}" no tiene ficha técnica`);
        }
      }

      // Calcular costos usando PEPS (simulación primero)
      const prendasParaCalculo = items.map(item => ({
        prenda_id: item.producto_id,
        cantidad: item.cantidad
      }));

      const calculoOrden = await CostoPrendaService.calcularCostoOrden(id, prendasParaCalculo);

      // Procesar consumos y registrar en Kardex
      for (const detallePrenda of calculoOrden.detalles_prendas) {
        for (const materia of detallePrenda.detalles_materias) {
          // Registrar consumo en orden_consumos
          await connection.execute(
            `INSERT INTO orden_consumos (orden_id, materia_prima_id, cantidad, unidad)
             VALUES (?, ?, ?, ?)`,
            [id, materia.materia_prima_id, materia.consumo_total, materia.unidad]
          );

          // Registrar salida en Kardex usando PEPS
          await KardexModel.registrarSalidaOrden({
            orden_id: id,
            materia_prima_id: materia.materia_prima_id,
            cantidad: materia.consumo_total,
            fecha: new Date()
          });
        }
      }

      // Actualizar costos en ordenes_items
      for (const detallePrenda of calculoOrden.detalles_prendas) {
        const itemCorrespondiente = items.find(item => item.producto_id === detallePrenda.prenda_id);
        if (itemCorrespondiente) {
          await connection.execute(
            `UPDATE ordenes_items SET costo_unitario = ?, costo_total = ? WHERE id = ?`,
            [detallePrenda.costo_unitario, detallePrenda.costo_total, itemCorrespondiente.id]
          );
        }
      }

      // Actualizar estado de la orden a 'costeada'
      await connection.execute(
        `UPDATE ordenes_produccion SET estado = 'costeada' WHERE id = ?`,
        [id]
      );

      await connection.commit();
      return {
        costo_total_orden: calculoOrden.costo_total_orden,
        detalles_prendas: calculoOrden.detalles_prendas
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}


module.exports = OrdenProduccionModel;

