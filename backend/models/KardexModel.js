const db = require('../database/db');

class KardexModel {
  /**
   * Registrar entrada de materia prima en el Kardex usando lotes PEPS
   * @param {Object} data - { materia_prima_id, cantidad, costo_unitario, referencia, referencia_id, compra_id, motivo, observaciones }
   */
  static async registrarEntrada(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const fecha = data.fecha || new Date();
      const nuevaCantidad = parseFloat(data.cantidad);
      const costoUnitario = parseFloat(data.costo_unitario);

      // Crear lote de materia prima (PEPS - lote nuevo)
      const [loteResult] = await connection.execute(
        `INSERT INTO lotes_materia_prima
         (materia_prima_id, factura_item_id, cantidad_original, cantidad_disponible, unidad_base, costo_unitario, fecha_ingreso)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.materia_prima_id,
          data.factura_item_id || null, // Puede ser null si no viene de factura
          nuevaCantidad,
          nuevaCantidad,
          data.unidad_base || 'unidad',
          costoUnitario,
          fecha
        ]
      );

      const loteId = loteResult.insertId;

      // Registrar movimiento de entrada en kardex
      await connection.execute(
        `INSERT INTO kardex
         (lote_id, tipo, referencia_tipo, referencia_id, cantidad, fecha)
         VALUES (?, 'entrada', ?, ?, ?, ?)`,
        [
          loteId,
          data.referencia_tipo || 'compra',
          data.referencia_id || data.compra_id || null,
          nuevaCantidad,
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
      return loteId;
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
    const params = [materiaPrimaId];
    let query = `
      SELECT
        k.*,
        lmp.materia_prima_id,
        mp.nombre as materia_nombre,
        mp.unidad_base,
        CASE
          WHEN LOWER(k.referencia_tipo) = 'compra' THEN CONCAT('Compra #', k.referencia_id)
          WHEN LOWER(k.referencia_tipo) = 'orden' THEN CONCAT('OP #', k.referencia_id)
          ELSE k.referencia_tipo
        END as referencia_descripcion
      FROM kardex k
      INNER JOIN lotes_materia_prima lmp ON k.lote_id = lmp.id
      INNER JOIN materias_primas mp ON lmp.materia_prima_id = mp.id
      WHERE lmp.materia_prima_id = ?
    `;

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
   * Obtener saldo actual de una materia prima (desde kardex_capas)
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

    // Obtener salidas del período desde kardex (movimientos por lote)
    const [salidas] = await db.execute(
      `SELECT SUM(k.cantidad) as total_salidas, COUNT(*) as total_movimientos
       FROM kardex k
       INNER JOIN lotes_materia_prima lmp ON k.lote_id = lmp.id
       WHERE lmp.materia_prima_id = ?
         AND k.tipo = 'salida'
         AND k.fecha >= ?`,
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
   * Registrar salida de materia prima usando PEPS (desde orden de producción o manual)
   * @param {Object} data - { materia_prima_id, cantidad, referencia, referencia_id, motivo, observaciones }
   * @returns {Object} - { movimiento_id, costo_total, costo_unitario, capas_utilizadas }
   */
  static async registrarSalida(data) {
    // Consumir lotes con PEPS e insertar movimientos en `kardex`
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const fecha = data.fecha || new Date();
      const cantidadRequerida = parseFloat(data.cantidad);

      // Verificar stock disponible desde lotes
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

        // Registrar movimiento de salida en kardex (por lote)
        await connection.execute(
          `INSERT INTO kardex
           (lote_id, tipo, referencia_tipo, referencia_id, cantidad, fecha)
           VALUES (?, 'salida', ?, ?, ?, ?)`,
          [lote.id, (data.referencia || 'OTRO'), data.referencia_id || null, cantidadAConsumir, fecha]
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

      // Actualizar stock en materia_prima
      await connection.execute(
        `UPDATE materias_primas
         SET stock_actual = stock_actual - ?
         WHERE id = ?`,
        [cantidadRequerida, data.materia_prima_id]
      );

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
   * Obtener análisis de consumo por período
   * @param {number} materiaPrimaId
   * @param {Date} fechaDesde
   * @param {Date} fechaHasta
   * @returns {Object} - Análisis de consumo
   */
  static async getAnalisisConsumo(materiaPrimaId, fechaDesde, fechaHasta) {
    const [resultados] = await db.execute(
      `SELECT
        k.tipo,
        SUM(k.cantidad) as total_cantidad,
        SUM(k.cantidad * lmp.costo_unitario) as total_costo,
        COUNT(*) as total_movimientos
       FROM kardex k
       INNER JOIN lotes_materia_prima lmp ON k.lote_id = lmp.id
       WHERE lmp.materia_prima_id = ?
         AND k.fecha >= ?
         AND k.fecha <= ?
       GROUP BY k.tipo`,
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

