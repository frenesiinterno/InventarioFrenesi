const FichaTecnicaModel = require('../models/FichaTecnicaModel');
const KardexModel = require('../models/KardexModel');
const MateriaPrimaModel = require('../models/MateriaPrimaModel');

class CostoPrendaService {
  /**
   * Calcular costo de una prenda basado en ficha técnica y PEPS (simulación)
   * @param {number} prendaId - ID de la prenda
   * @param {number} cantidad - Cantidad de prendas a producir
   * @returns {Object} - { costo_unitario, costo_total, detalles_materias }
   */
  static async calcularCostoPrenda(prendaId, cantidad) {
    // Obtener ficha técnica de la prenda
    const fichaTecnica = await FichaTecnicaModel.getByPrendaId(prendaId);

    if (!fichaTecnica || fichaTecnica.length === 0) {
      throw new Error(`No se encontró ficha técnica para la prenda ${prendaId}`);
    }

    let costoTotalPrenda = 0;
    const detallesMaterias = [];

    // Calcular costo para cada materia prima en la ficha técnica
    for (const item of fichaTecnica) {
      const consumoPorPrenda = parseFloat(item.consumo);
      const consumoTotal = consumoPorPrenda * cantidad;

      // Verificar stock disponible antes de calcular costo
      const stockDisponible = await MateriaPrimaModel.getStockDisponible(item.materia_prima_id);
      if (stockDisponible < consumoTotal) {
        throw new Error(`Stock insuficiente para ${item.nombre_materia}. Disponible: ${stockDisponible}, Requerido: ${consumoTotal}`);
      }

      // Simular consumo PEPS para obtener costo real (sin consumir realmente)
      const costoSimulado = await KardexModel.simularConsumoPEPS(item.materia_prima_id, consumoTotal);

      if (costoSimulado.costo_total === 0) {
        throw new Error(`No hay stock disponible o costo definido para materia prima: ${item.nombre_materia}`);
      }

      costoTotalPrenda += costoSimulado.costo_total;

      detallesMaterias.push({
        materia_prima_id: item.materia_prima_id,
        nombre_materia: item.nombre_materia,
        consumo_por_prenda: consumoPorPrenda,
        unidad: item.unidad,
        consumo_total: consumoTotal,
        costo_unitario_promedio: costoSimulado.costo_unitario,
        costo_total_materia: costoSimulado.costo_total,
        lotes_simulados: costoSimulado.lotes_utilizados
      });
    }

    const costoUnitarioPrenda = cantidad > 0 ? costoTotalPrenda / cantidad : 0;

    return {
      costo_unitario: costoUnitarioPrenda,
      costo_total: costoTotalPrenda,
      detalles_materias: detallesMaterias,
      cantidad_prendas: cantidad
    };
  }

  /**
   * Calcular costos para múltiples prendas en una orden
   * @param {Array} prendas - [{ prenda_id, cantidad }, ...]
   * @returns {Object} - { costo_total_orden, detalles_prendas }
   */
  static async calcularCostoOrden(ordenId, prendas) {
    let costoTotalOrden = 0;
    const detallesPrendas = [];

    for (const prenda of prendas) {
      const calculoPrenda = await this.calcularCostoPrenda(prenda.prenda_id, prenda.cantidad);

      costoTotalOrden += calculoPrenda.costo_total;

      detallesPrendas.push({
        prenda_id: prenda.prenda_id,
        cantidad: prenda.cantidad,
        ...calculoPrenda
      });
    }

    return {
      orden_id: ordenId,
      costo_total_orden: costoTotalOrden,
      detalles_prendas: detallesPrendas
    };
  }

  /**
   * Verificar si hay suficiente stock para producir una prenda
   * @param {number} prendaId - ID de la prenda
   * @param {number} cantidad - Cantidad de prendas
   * @returns {Object} - { suficiente_stock, faltantes }
   */
  static async verificarStockPrenda(prendaId, cantidad) {
    const fichaTecnica = await FichaTecnicaModel.getByPrendaId(prendaId);

    if (!fichaTecnica || fichaTecnica.length === 0) {
      throw new Error(`No se encontró ficha técnica para la prenda ${prendaId}`);
    }

    const faltantes = [];

    for (const item of fichaTecnica) {
      const consumoTotal = parseFloat(item.consumo) * cantidad;
      const stockDisponible = await MateriaPrimaModel.getStockDisponible(item.materia_prima_id);

      if (stockDisponible < consumoTotal) {
        faltantes.push({
          materia_prima_id: item.materia_prima_id,
          nombre_materia: item.nombre_materia,
          requerido: consumoTotal,
          disponible: stockDisponible,
          faltante: consumoTotal - stockDisponible
        });
      }
    }

    return {
      suficiente_stock: faltantes.length === 0,
      faltantes: faltantes
    };
  }

  /**
   * Obtener resumen de costos por período
   * @param {Date} fechaDesde
   * @param {Date} fechaHasta
   * @returns {Object} - Resumen de costos
   */
  static async getResumenCostos(fechaDesde, fechaHasta) {
    // Obtener todas las órdenes procesadas en el período
    const query = `
      SELECT
        op.id,
        op.fecha,
        op.estado,
        SUM(oi.costo_total) as costo_total_orden,
        COUNT(oi.id) as cantidad_prendas
      FROM ordenes_produccion op
      INNER JOIN ordenes_items oi ON op.id = oi.orden_id
      WHERE op.fecha >= ? AND op.fecha <= ? AND op.estado = 'producida'
      GROUP BY op.id, op.fecha, op.estado
      ORDER BY op.fecha DESC
    `;

    const db = require('../database/db');
    const [ordenes] = await db.execute(query, [fechaDesde, fechaHasta]);

    const resumen = {
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      total_ordenes: ordenes.length,
      costo_total_periodo: ordenes.reduce((sum, orden) => sum + parseFloat(orden.costo_total_orden || 0), 0),
      prendas_totales: ordenes.reduce((sum, orden) => sum + parseInt(orden.cantidad_prendas || 0), 0),
      costo_promedio_por_prenda: 0,
      ordenes: ordenes
    };

    if (resumen.prendas_totales > 0) {
      resumen.costo_promedio_por_prenda = resumen.costo_total_periodo / resumen.prendas_totales;
    }

    return resumen;
  }
}

module.exports = CostoPrendaService;
