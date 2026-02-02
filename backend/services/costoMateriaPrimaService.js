const db = require('../database/db');
const FichaTecnicaModel = require('../models/FichaTecnicaModel');
const KardexModel = require('../models/KardexModel');

/**
 * Servicio para calcular costos de materia prima por producto
 * Utiliza el método PEPS (Primeras Entradas Primeras Salidas)
 */
class CostoMateriaPrimaService {
  /**
   * Calcula el costo total de materia prima para producir un producto
   * @param {number} productoId - ID del producto
   * @param {number} cantidad - Cantidad a producir
   * @returns {Object} { costo_total, detalles }
   */
  static async calcularCostoProducto(productoId, cantidad) {
    try {
      if (!productoId || cantidad <= 0) {
        return {
          costo_total: 0,
          costo_unitario: 0,
          detalles: [],
          error: 'Producto o cantidad inválida'
        };
      }
    
      // Obtener ficha técnica del producto
      const fichaResponse = await db.execute(`
        SELECT 
          ft.id,
          ft.materia_prima_id,
          ft.cantidad,
          mp.nombre as materia_nombre,
          mp.codigo as materia_codigo,
          um.nombre as unidad_nombre,
          um.codigo as unidad_codigo
        FROM fichas_tecnicas ft
        JOIN materia_prima mp ON ft.materia_prima_id = mp.id
        JOIN unidades_medida um ON mp.unidad_medida_id = um.id
        WHERE ft.producto_id = ?
        ORDER BY ft.id ASC
      `, [productoId]);

      const [fichas] = fichaResponse;

      if (!fichas || fichas.length === 0) {
        return {
          costo_total: 0,
          costo_unitario: 0,
          detalles: [],
          error: 'No se encontró ficha técnica para este producto'
        };
      }
    
      let costoTotal = 0;
      const detalles = [];

      // Calcular costo para cada material
      for (const ficha of fichas) {
        const cantidadNecesaria = ficha.cantidad * cantidad;
        
        // Obtener el costo promedio del material usando PEPS (desde Kardex si existe)
        let costoPromedio = 0;
        let costoMaterial = 0;

        try {
          // Intentar obtener costo promedio desde Kardex
          const saldoResponse = await db.execute(`
            SELECT 
              COALESCE(costo_promedio, 0) as costo_promedio,
              cantidad as saldo_cantidad,
              costo as saldo_costo
            FROM kardex_saldo
            WHERE materia_prima_id = ?
            LIMIT 1
          `, [ficha.materia_prima_id]);

          const [saldos] = saldoResponse;
          if (saldos && saldos.length > 0) {
            costoPromedio = parseFloat(saldos[0].costo_promedio) || 0;
          }
        } catch (error) {
          // Si la tabla kardex_saldo no existe, usar precio_unitario
          console.warn(`Kardex no disponible para materia ${ficha.materia_prima_id}, usando precio_unitario`);
        }

        // Si no hay costo promedio en Kardex, usar el precio unitario de materia prima
        if (costoPromedio === 0) {
          const precioResponse = await db.execute(`
            SELECT precio_unitario
            FROM materia_prima
            WHERE id = ?
          `, [ficha.materia_prima_id]);

          const [precios] = precioResponse;
          if (precios && precios.length > 0) {
            costoPromedio = parseFloat(precios[0].precio_unitario) || 0;
          }
        }

        costoMaterial = cantidadNecesaria * costoPromedio;
        costoTotal += costoMaterial;

        detalles.push({
          materia_prima_id: ficha.materia_prima_id,
          materia_nombre: ficha.materia_nombre,
          materia_codigo: ficha.materia_codigo,
          unidad_nombre: ficha.unidad_nombre,
          unidad_codigo: ficha.unidad_codigo,
          cantidad_por_prenda: ficha.cantidad,
          cantidad_total_necesaria: cantidadNecesaria,
          costo_unitario: costoPromedio,
          costo_material: costoMaterial
        });
      }

      const costoUnitario = costoTotal / cantidad;

      return {
        costo_total: Math.round(costoTotal * 10000) / 10000, // Redondear a 4 decimales
        costo_unitario: Math.round(costoUnitario * 10000) / 10000,
        cantidad_producida: cantidad,
        detalles: detalles
      };
    } catch (error) {
      console.error('Error calculando costo de materia prima:', error);
      throw error;
    }
  }

  /**
   * Calcula costos para múltiples items de una orden
   * @param {Array} items - Array de items con { producto_id, cantidad }
   * @returns {Array} Array con costos calculados
   */
  static async calcularCostosMultiples(items) {
    const resultados = [];

    for (const item of items) {
      const costo = await this.calcularCostoProducto(item.producto_id, item.cantidad);
      resultados.push({
        ...item,
        ...costo
      });
    }

    return resultados;
  }

  /**
   * Obtiene detalles de costos formateados para mostrar
   * @param {Object} detalles - Objeto de detalles de costos
   * @returns {string} HTML formateado con los detalles
   */
  static formatearDetallesHTML(detalles) {
    if (!detalles || detalles.length === 0) {
      return '<p>No hay detalles de costos disponibles</p>';
    }

    let html = '<table class="detalles-costo"><thead><tr>';
    html += '<th>Material</th><th>Cantidad</th><th>Costo Unit.</th><th>Subtotal</th>';
    html += '</tr></thead><tbody>';

    for (const detalle of detalles) {
      html += '<tr>';
      html += `<td>${detalle.materia_nombre}</td>`;
      html += `<td>${detalle.cantidad_total_necesaria.toFixed(3)} ${detalle.unidad_codigo}</td>`;
      html += `<td>$${detalle.costo_unitario.toFixed(4)}</td>`;
      html += `<td>$${detalle.costo_material.toFixed(2)}</td>`;
      html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
  }
}

module.exports = CostoMateriaPrimaService;
