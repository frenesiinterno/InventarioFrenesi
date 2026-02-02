const db = require('../database/db');

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
        `UPDATE materia_prima 
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
   * Registrar salida usando PEPS con conexión externa (para usar en transacción mayor).
   * No hace commit/rollback/release; el llamador gestiona la transacción.
   * @param {Object} connection - Conexión MySQL con transacción iniciada
   * @param {Object} data - { materia_prima_id, cantidad, referencia, referencia_id, motivo, observaciones }
   * @returns {Object} - { movimiento_id, costo_total, costo_unitario, capas_utilizadas }
   */
  static async registrarSalidaConConexion(connection, data) {
    const fecha = data.fecha || new Date();
    const cantidadRequerida = parseFloat(data.cantidad);

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

    if (saldoCantidadAnterior < cantidadRequerida) {
      throw new Error(`Stock insuficiente. Disponible: ${saldoCantidadAnterior}, Requerido: ${cantidadRequerida}`);
    }

    const [capas] = await connection.execute(
      `SELECT id, cantidad_restante, costo_unitario 
       FROM kardex_capas 
       WHERE materia_prima_id = ? AND cantidad_restante > 0
       ORDER BY fecha_entrada ASC, id ASC`,
      [data.materia_prima_id]
    );

    let cantidadRestante = cantidadRequerida;
    let costoTotal = 0;
    const capasUtilizadas = [];

    for (const capa of capas) {
      if (cantidadRestante <= 0) break;
      const cantidadCapa = parseFloat(capa.cantidad_restante);
      const costoUnitario = parseFloat(capa.costo_unitario);
      const cantidadAConsumir = Math.min(cantidadRestante, cantidadCapa);
      costoTotal += cantidadAConsumir * costoUnitario;
      cantidadRestante -= cantidadAConsumir;
      const nuevaCantidadCapa = cantidadCapa - cantidadAConsumir;
      if (nuevaCantidadCapa <= 0) {
        await connection.execute(`DELETE FROM kardex_capas WHERE id = ?`, [capa.id]);
      } else {
        await connection.execute(`UPDATE kardex_capas SET cantidad_restante = ? WHERE id = ?`, [nuevaCantidadCapa, capa.id]);
      }
      capasUtilizadas.push({ capa_id: capa.id, cantidad: cantidadAConsumir, costo_unitario: costoUnitario });
    }

    if (cantidadRestante > 0) {
      throw new Error(`Error al consumir todas las capas. Faltan ${cantidadRestante} unidades`);
    }

    const costoUnitarioSalida = cantidadRequerida > 0 ? costoTotal / cantidadRequerida : 0;
    const nuevoSaldoCantidad = saldoCantidadAnterior - cantidadRequerida;
    const nuevoSaldoCosto = saldoCostoAnterior - costoTotal;

    const [result] = await connection.execute(
      `INSERT INTO kardex_movimientos 
       (materia_prima_id, fecha, tipo, cantidad, costo_unitario, saldo_cantidad, saldo_costo, referencia, referencia_id, motivo, observaciones)
       VALUES (?, ?, 'SALIDA', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.materia_prima_id, fecha, cantidadRequerida, costoUnitarioSalida, nuevoSaldoCantidad, nuevoSaldoCosto,
        data.referencia || 'OTRO', data.referencia_id || null, data.motivo || null, data.observaciones || null
      ]
    );

    await connection.execute(
      `UPDATE materia_prima SET stock_actual = stock_actual - ? WHERE id = ?`,
      [cantidadRequerida, data.materia_prima_id]
    );

    return {
      movimiento_id: result.insertId,
      costo_total: costoTotal,
      costo_unitario: costoUnitarioSalida,
      capas_utilizadas: capasUtilizadas
    };
  }

  /**
   * Registrar salida de materia prima usando PEPS
   * @param {Object} data - { materia_prima_id, cantidad, referencia, referencia_id, motivo, observaciones }
   * @returns {Object} - { movimiento_id, costo_total, capas_utilizadas }
   */
  static async registrarSalida(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const fecha = data.fecha || new Date();
      const cantidadRequerida = parseFloat(data.cantidad);

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

      if (saldoCantidadAnterior < cantidadRequerida) {
        throw new Error(`Stock insuficiente. Disponible: ${saldoCantidadAnterior}, Requerido: ${cantidadRequerida}`);
      }

      // Obtener capas disponibles (PEPS - más antiguas primero)
      const [capas] = await connection.execute(
        `SELECT id, cantidad_restante, costo_unitario 
         FROM kardex_capas 
         WHERE materia_prima_id = ? AND cantidad_restante > 0
         ORDER BY fecha_entrada ASC, id ASC`,
        [data.materia_prima_id]
      );

      let cantidadRestante = cantidadRequerida;
      let costoTotal = 0;
      const capasUtilizadas = [];

      // Consumir capas en orden PEPS
      for (const capa of capas) {
        if (cantidadRestante <= 0) break;

        const cantidadCapa = parseFloat(capa.cantidad_restante);
        const costoUnitario = parseFloat(capa.costo_unitario);
        const cantidadAConsumir = Math.min(cantidadRestante, cantidadCapa);

        costoTotal += cantidadAConsumir * costoUnitario;
        cantidadRestante -= cantidadAConsumir;

        // Actualizar o eliminar capa
        const nuevaCantidadCapa = cantidadCapa - cantidadAConsumir;
        if (nuevaCantidadCapa <= 0) {
          await connection.execute(
            `DELETE FROM kardex_capas WHERE id = ?`,
            [capa.id]
          );
        } else {
          await connection.execute(
            `UPDATE kardex_capas SET cantidad_restante = ? WHERE id = ?`,
            [nuevaCantidadCapa, capa.id]
          );
        }

        capasUtilizadas.push({
          capa_id: capa.id,
          cantidad: cantidadAConsumir,
          costo_unitario: costoUnitario
        });
      }

      if (cantidadRestante > 0) {
        throw new Error(`Error al consumir todas las capas. Faltan ${cantidadRestante} unidades`);
      }

      // Calcular costo unitario promedio para la salida
      const costoUnitarioSalida = cantidadRequerida > 0 ? costoTotal / cantidadRequerida : 0;

      // Calcular nuevos saldos
      const nuevoSaldoCantidad = saldoCantidadAnterior - cantidadRequerida;
      const nuevoSaldoCosto = saldoCostoAnterior - costoTotal;

      // Insertar movimiento en Kardex
      const [result] = await connection.execute(
        `INSERT INTO kardex_movimientos 
         (materia_prima_id, fecha, tipo, cantidad, costo_unitario, saldo_cantidad, saldo_costo, referencia, referencia_id, motivo, observaciones)
         VALUES (?, ?, 'SALIDA', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.materia_prima_id,
          fecha,
          cantidadRequerida,
          costoUnitarioSalida,
          nuevoSaldoCantidad,
          nuevoSaldoCosto,
          data.referencia || 'OTRO',
          data.referencia_id || null,
          data.motivo || null,
          data.observaciones || null
        ]
      );

      // Actualizar stock en materia_prima
      await connection.execute(
        `UPDATE materia_prima 
         SET stock_actual = stock_actual - ? 
         WHERE id = ?`,
        [cantidadRequerida, data.materia_prima_id]
      );

      await connection.commit();
      return {
        movimiento_id: result.insertId,
        costo_total: costoTotal,
        costo_unitario: costoUnitarioSalida,
        capas_utilizadas: capasUtilizadas
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener costo promedio ponderado actual de una materia prima
   * @param {number} materiaPrimaId 
   * @returns {number}
   */
  static async getCostoPromedio(materiaPrimaId) {
    const [rows] = await db.execute(
      `SELECT saldo_cantidad, saldo_costo 
       FROM kardex_movimientos 
       WHERE materia_prima_id = ? 
       ORDER BY fecha DESC, id DESC 
       LIMIT 1`,
      [materiaPrimaId]
    );

    if (!rows[0] || parseFloat(rows[0].saldo_cantidad) === 0) {
      return 0;
    }

    const saldoCantidad = parseFloat(rows[0].saldo_cantidad);
    const saldoCosto = parseFloat(rows[0].saldo_costo);

    return saldoCosto / saldoCantidad;
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
        mp.nombre as materia_nombre,
        mp.codigo as materia_codigo,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre,
        op.numero_orden
      FROM kardex_movimientos k
      INNER JOIN materia_prima mp ON k.materia_prima_id = mp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN ordenes_produccion op ON k.referencia = 'OP' AND k.referencia_id = op.id
      WHERE k.materia_prima_id = ?
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

    // LIMIT y OFFSET no pueden ser parámetros en prepared statements de MySQL
    // Validamos y concatenamos directamente en la query
    if (options.limit) {
      const limitValue = parseInt(options.limit, 10);
      if (limitValue > 0 && limitValue <= 10000) { // Validación de seguridad
        query += ` LIMIT ${limitValue}`;
        if (options.offset) {
          const offsetValue = parseInt(options.offset, 10);
          if (offsetValue >= 0 && offsetValue <= 100000) { // Validación de seguridad
            query += ` OFFSET ${offsetValue}`;
          }
        }
      }
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Obtener saldo actual de una materia prima
   * @param {number} materiaPrimaId 
   */
  static async getSaldoActual(materiaPrimaId) {
    const [rows] = await db.execute(
      `SELECT saldo_cantidad, saldo_costo 
       FROM kardex_movimientos 
       WHERE materia_prima_id = ? 
       ORDER BY fecha DESC, id DESC 
       LIMIT 1`,
      [materiaPrimaId]
    );

    if (!rows[0]) {
      return { cantidad: 0, costo: 0, costo_promedio: 0 };
    }

    const cantidad = parseFloat(rows[0].saldo_cantidad);
    const costo = parseFloat(rows[0].saldo_costo);
    const costoPromedio = cantidad > 0 ? costo / cantidad : 0;

    return {
      cantidad,
      costo,
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

