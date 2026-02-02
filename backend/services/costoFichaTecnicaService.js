const KardexModel = require('../models/KardexModel');
const FichaTecnicaModel = require('../models/FichaTecnicaModel');

/**
 * Servicio para calcular costos dinámicos de fichas técnicas desde el Kardex
 * Los costos se calculan usando el costo promedio ponderado actual del Kardex
 */

/**
 * Calcular costo estimado de una ficha técnica usando costo promedio actual
 * @param {number} productoId 
 * @returns {Object} - { items: [...], costo_total_estimado, resumen: [...] }
 */
async function calcularCostoFichaTecnica(productoId) {
  // Obtener ficha técnica (solo consumo)
  const items = await FichaTecnicaModel.getByProducto(productoId);
  
  // Calcular costos para cada item usando costo promedio del Kardex
  const itemsConCosto = await Promise.all(
    items.map(async (item) => {
      const costoPromedio = await KardexModel.getCostoPromedio(item.materia_prima_id);
      const cantidad = parseFloat(item.cantidad) || 0;
      const costoTotal = cantidad * costoPromedio;

      return {
        ...item,
        costo_unitario_promedio: costoPromedio,
        costo_total_estimado: costoTotal
      };
    })
  );

  // Calcular costo total
  const costoTotalEstimado = itemsConCosto.reduce(
    (sum, item) => sum + (item.costo_total_estimado || 0),
    0
  );

  // Obtener resumen agrupado por tipo
  const resumen = await FichaTecnicaModel.getResumenByProducto(productoId);
  const resumenConCosto = await Promise.all(
    resumen.map(async (grupo) => {
      // Obtener items de este tipo
      const itemsTipo = itemsConCosto.filter(item => item.tipo_nombre === grupo.tipo);
      const costoTotalTipo = itemsTipo.reduce(
        (sum, item) => sum + (item.costo_total_estimado || 0),
        0
      );

      return {
        ...grupo,
        costo_total_estimado: costoTotalTipo
      };
    })
  );

  return {
    items: itemsConCosto,
    costo_total_estimado: costoTotalEstimado,
    resumen: resumenConCosto
  };
}

/**
 * Calcular costo real de producción usando PEPS
 * Este método se usa cuando se procesa una orden de producción
 * @param {number} productoId 
 * @param {number} cantidadPrendas 
 * @returns {Object} - { items: [...], costo_total_real }
 */
async function calcularCostoRealProduccion(productoId, cantidadPrendas) {
  const items = await FichaTecnicaModel.getByProducto(productoId);
  
  // Calcular consumo total por materia prima
  const consumosPorMateria = {};
  items.forEach(item => {
    const materiaId = item.materia_prima_id;
    const cantidadPorPrenda = parseFloat(item.cantidad) || 0;
    const consumoTotal = cantidadPorPrenda * cantidadPrendas;

    if (!consumosPorMateria[materiaId]) {
      consumosPorMateria[materiaId] = {
        materia_prima_id: materiaId,
        materia_nombre: item.materia_nombre,
        unidad_nombre: item.unidad_nombre,
        cantidad_por_prenda: cantidadPorPrenda,
        cantidad_total: 0,
        costo_total: 0
      };
    }

    consumosPorMateria[materiaId].cantidad_total += consumoTotal;
  });

  // Calcular costos reales usando PEPS (simulación)
  // Nota: El costo real se calcula cuando se procesa la orden de producción
  // usando KardexModel.registrarSalida()
  const itemsConCosto = Object.values(consumosPorMateria).map(item => ({
    ...item,
    costo_unitario_promedio: 0, // Se calculará al procesar
    costo_total_estimado: 0 // Se calculará al procesar
  }));

  return {
    items: itemsConCosto,
    cantidad_prendas: cantidadPrendas
  };
}

module.exports = {
  calcularCostoFichaTecnica,
  calcularCostoRealProduccion
};

