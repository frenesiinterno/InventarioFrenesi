const db = require('../database/db');

class KardexModel {
  /**

class KardexModel {
  /**
   * Registrar entrada de materia prima en el Kardex
   * @param {Object} data - { materia_prima_id, cantidad, costo_unitario, referencia, referencia_id, motivo, observaciones }
   */
  static async registrarEntrada(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const fecha = data.fecha || new Date();

      // Obtener saldo anterior
      const [saldoAnterior] = await connection.execute(
        `SELECT saldo_cantidad, saldo_costo 
         FROM kardex_movimientos 
         WHERE materia_prima_id = ? 
         ORDER BY fecha DESC, id DESC 
         LIMIT 1`,
        [data.materia_prima_id]
      );

      const saldoCantidadAnterior = parseFloat(saldoAnterior[0]?.saldo_cantidad || 0);
      const saldoCostoAnterior = parseFloat(saldoAnterior[0]?.saldo_costo || 0);
      
      // Calcular nuevos saldos
      const nuevaCantidad = parseFloat(data.cantidad);
      const costoUnitario = parseFloat(data.costo_unitario);
      const nuevoSaldoCantidad = saldoCantidadAnterior + nuevaCantidad;
      const nuevoSaldoCosto = saldoCostoAnterior + (nuevaCantidad * costoUnitario);
      

      // Insertar movimiento en Kardex
      const [result] = await connection.execute(
        `INSERT INTO kardex_movimientos 
         (materia_prima_id, fecha, tipo, cantidad, costo_unitario, saldo_cantidad, saldo_costo, referencia, referencia_id, motivo, observaciones)
         VALUES (?, ?, 'ENTRADA', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.materia_prima_id,
          fecha,
          nuevaCantidad,
          costoUnitario,
          nuevoSaldoCantidad,
          nuevoSaldoCosto,
          data.referencia || 'OTRO',
          data.referencia_id || null,
          data.motivo || null,
          data.observaciones || null
        ]
      );

      const movimientoId = result.insertId;

      // Crear capa PEPS
      await connection.execute(
        `INSERT INTO kardex_capas 
         (materia_prima_id, kardex_movimiento_id, cantidad_restante, costo_unitario, fecha_entrada)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.materia_prima_id,
          movimientoId,
          nuevaCantidad,
          costoUnitario,
          fecha
        ]
      );

      // Actualizar stock en materia_prima
      await connection.execute(
        `UPDATE materias_primas 
         SET stock_actual = stock_actual + ? 
         WHERE id = ?`,
        [nuevaCantidad, data.materia_prima_id]
      );

      await connection.commit();
      return movimientoId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Registrar salida de materia prima usando PEPS (desde orden de producción)
   * @param {Object} data - { orden_id, materia_prima_id, cantidad, fecha }
   * @returns {Object} - { costo_total, costo_unitario, lotes_utilizados }
   */
  static async registrarSalidaOrden(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const fecha = data.fecha || new Date();
      const cantidadRequerida = parseFloat(data.cantidad);

      // Verificar stock disponible
      const [stockDisponible] = await connection.execute(
        `SELECT COALESCE(SUM(cantidad_disponible), 0) as stock_disponible
         FROM lotes_materia_prima
         WHERE materia_prima_id = ?`,
        [data.materia_prima_id]
      );

      const stockActual = parseFloat(stockDisponible[0]?.stock_disponible || 0);
      if (stockActual < cantidadRequerida) {
        throw new Error(`Stock insuficiente. Disponible: ${stockActual}, Requerido: ${cantidadRequerida}`);
      }

      // Obtener lotes disponibles (PEPS - más antiguas primero)
      const [lotes] = await connection.execute(
        `SELECT id, cantidad_disponible, costo_unitario
         FROM lotes_materia_prima
         WHERE materia_prima_id = ? AND cantidad_disponible > 0
         ORDER BY fecha_ingreso ASC, id ASC`,
        [data.materia_prima_id]
      );

      let cantidadRestante = cantidadRequerida;
      let costoTotal = 0;
      const lotesUtilizados = [];

      // Consumir lotes en orden PEPS
      for (const lote of lotes) {
        if (cantidadRestante <= 0) break;

        const cantidadLote = parseFloat(lote.cantidad_disponible);
        const costoUnitario = parseFloat(lote.costo_unitario);
        const cantidadAConsumir = Math.min(cantidadRestante, cantidadLote);

        costoTotal += cantidadAConsumir * costoUnitario;
        cantidadRestante -= cantidadAConsumir;

        // Actualizar lote
        const nuevaCantidadLote = cantidadLote - cantidadAConsumir;
        await connection.execute(
          `UPDATE lotes_materia_prima SET cantidad_disponible = ? WHERE id = ?`,
          [nuevaCantidadLote, lote.id]
        );

        // Registrar movimiento de salida en kardex
        await connection.execute(
          `INSERT INTO kardex
           (lote_id, tipo, referencia_tipo, referencia_id, cantidad, fecha)
           VALUES (?, 'salida', 'orden', ?, ?, ?)`,
          [lote.id, data.orden_id, cantidadAConsumir, fecha]
        );

        lotesUtilizados.push({
          lote_id: lote.id,
          cantidad: cantidadAConsumir,
          costo_unitario: costoUnitario
        });
      }

      if (cantidadRestante > 0) {
        throw new Error(`Error al consumir todos los lotes. Faltan ${cantidadRestante} unidades`);
      }

      // Calcular costo unitario promedio
      const costoUnitarioPromedio = cantidadRequerida > 0 ? costoTotal / cantidadRequerida : 0;

      await connection.commit();
      return {
        costo_total: costoTotal,
        costo_unitario: costoUnitarioPromedio,
        lotes_utilizados: lotesUtilizados
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener costo promedio ponderado actual de una materia prima (desde lotes)
   * @param {number} materiaPrimaId
   * @returns {number}
   */
  static async getCostoPromedio(materiaPrimaId) {
    const [rows] = await db.execute(
      `SELECT
        SUM(cantidad_disponible * costo_unitario) / NULLIF(SUM(cantidad_disponible), 0) as costo_promedio
       FROM lotes_materia_prima
       WHERE materia_prima_id = ? AND cantidad_disponible > 0`,
      [materiaPrimaId]
    );

    return parseFloat(rows[0]?.costo_promedio || 0);
  }

  /**
   * Obtener movimientos de Kardex por materia prima
   * @param {number} materiaPrimaId
   * @param {Object} options - { limit, offset, fechaDesde, fechaHasta }
   */
  static async getMovimientosByMateria(materiaPrimaId, options = {}) {
    let query = `
      SELECT
        k.*,
        lmp.cantidad_original,
        lmp.cantidad_disponible,
        lmp.costo_unitario as lote_costo_unitario,
        lmp.fecha_ingreso,
        mp.nombre as materia_nombre,
        mp.unidad_base,
        CASE
          WHEN k.referencia_tipo = 'factura' THEN CONCAT('Factura #', fc.numero_factura)
          WHEN k.referencia_tipo = 'orden' THEN CONCAT('OP #', op.codigo_siigo)
          ELSE 'Otro'
        END as referencia_descripcion
      FROM kardex k
      INNER JOIN lotes_materia_prima lmp ON k.lote_id = lmp.id
      INNER JOIN materias_primas mp ON lmp.materia_prima_id = mp.id
      LEFT JOIN facturas_compra fc ON k.referencia_tipo = 'factura' AND k.referencia_id = fc.id
      LEFT JOIN ordenes_produccion op ON k.referencia_tipo = 'orden' AND k.referencia_id = op.id
      WHERE mp.id = ?
    `;
    const params = [materiaPrimaId];

    if (options.fechaDesde) {
      query += ` AND k.fecha >= ?`;
      params.push(options.fechaDesde);
    }

    if (options.fechaHasta) {
      query += ` AND k.fecha <= ?`;
      params.push(options.fechaHasta);
    }

    query += ` ORDER BY k.fecha DESC, k.id DESC`;

    if (options.limit) {
      const limitValue = parseInt(options.limit, 10);
      if (limitValue > 0 && limitValue <= 10000) {
        query += ` LIMIT ${limitValue}`;
        if (options.offset) {
          const offsetValue = parseInt(options.offset, 10);
          if (offsetValue >= 0 && offsetValue <= 100000) {
            query += ` OFFSET ${offsetValue}`;
          }
        }
      }
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Obtener saldo actual de una materia prima (desde lotes)
   * @param {number} materiaPrimaId
   */
  static async getSaldoActual(materiaPrimaId) {
    const [rows] = await db.execute(
      `SELECT
        COALESCE(SUM(cantidad_disponible), 0) as cantidad,
        COALESCE(SUM(cantidad_disponible * costo_unitario), 0) as costo_total
       FROM lotes_materia_prima
       WHERE materia_prima_id = ? AND cantidad_disponible > 0`,
      [materiaPrimaId]
    );

    const cantidad = parseFloat(rows[0]?.cantidad || 0);
    const costoTotal = parseFloat(rows[0]?.costo_total || 0);
    const costoPromedio = cantidad > 0 ? costoTotal / cantidad : 0;

    return {
      cantidad,
      costo: costoTotal,
      costo_promedio: costoPromedio
    };
  }

  /**
   * Calcular pronóstico de consumo basado en promedio de días
   * @param {number} materiaPrimaId 
   * @param {number} diasAnalizar - Días hacia atrás para analizar (default: 30)
   * @returns {Object} - { consumo_promedio_diario, dias_restantes, fecha_estimada_agotamiento, consumo_total_periodo }
   */
  static async calcularPronosticoConsumo(materiaPrimaId, diasAnalizar = 30) {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - diasAnalizar);

    // Obtener salidas del período
    const [salidas] = await db.execute(
      `SELECT SUM(cantidad) as total_salidas, COUNT(*) as total_movimientos
       FROM kardex_movimientos 
       WHERE materia_prima_id = ? 
         AND tipo = 'SALIDA'
         AND fecha >= ?`,
      [materiaPrimaId, fechaInicio]
    );

    const totalSalidas = parseFloat(salidas[0]?.total_salidas || 0);
    const consumoPromedioDiario = totalSalidas / diasAnalizar;

    // Obtener saldo actual
    const saldoActual = await this.getSaldoActual(materiaPrimaId);
    const cantidadActual = saldoActual.cantidad;

    // Calcular días restantes
    let diasRestantes = null;
    let fechaEstimadaAgotamiento = null;
    
    if (consumoPromedioDiario > 0) {
      diasRestantes = Math.floor(cantidadActual / consumoPromedioDiario);
      const fechaAgotamiento = new Date();
      fechaAgotamiento.setDate(fechaAgotamiento.getDate() + diasRestantes);
      fechaEstimadaAgotamiento = fechaAgotamiento;
    }

    return {
      consumo_promedio_diario: consumoPromedioDiario,
      consumo_total_periodo: totalSalidas,
      dias_analizados: diasAnalizar,
      cantidad_actual: cantidadActual,
      dias_restantes: diasRestantes,
      fecha_estimada_agotamiento: fechaEstimadaAgotamiento,
      alerta_urgente: diasRestantes !== null && diasRestantes <= 7,
      alerta_preventiva: diasRestantes !== null && diasRestantes > 7 && diasRestantes <= 30
    };
  }

  /**
   * Obtener análisis de consumo por período
   * @param {number} materiaPrimaId 
   * @param {Date} fechaDesde 
   * @param {Date} fechaHasta 
   * @returns {Object} - Análisis de consumo
   */
  static async getAnalisisConsumo(materiaPrimaId, fechaDesde, fechaHasta) {
    const [resultados] = await db.execute(
      `SELECT 
        tipo,
        SUM(cantidad) as total_cantidad,
        SUM(cantidad * costo_unitario) as total_costo,
        COUNT(*) as total_movimientos
       FROM kardex_movimientos 
       WHERE materia_prima_id = ? 
         AND fecha >= ? 
         AND fecha <= ?
       GROUP BY tipo`,
      [materiaPrimaId, fechaDesde, fechaHasta]
    );

    const analisis = {
      entradas: { cantidad: 0, costo: 0, movimientos: 0 },
      salidas: { cantidad: 0, costo: 0, movimientos: 0 },
      ajustes: { cantidad: 0, costo: 0, movimientos: 0 }
    };

    resultados.forEach(row => {
      const tipo = row.tipo.toLowerCase();
      if (analisis[tipo]) {
        analisis[tipo].cantidad = parseFloat(row.total_cantidad || 0);
        analisis[tipo].costo = parseFloat(row.total_costo || 0);
        analisis[tipo].movimientos = parseInt(row.total_movimientos || 0);
      }
    });

    return analisis;
  }
}

module.exports = KardexModel;

