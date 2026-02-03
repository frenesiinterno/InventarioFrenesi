const db = require('../database/db');
const similarity = require('string-similarity');

/**
 * Servicio para hacer matching entre nombres de productos del PDF
 * y fichas técnicas existentes
 */
class FichaTecnicaMatcher {
  /**
   * Busca fichas técnicas que coincidan con un nombre de producto
   * @param {string} nombreProducto - Nombre del producto del PDF
   * @param {number} limite - Número máximo de resultados
   * @returns {Array} Array de fichas técnicas con score de similitud
   */
  static async buscarFichasTecnicas(nombreProducto, limite = 10) {
    try {
      // Normalizar nombre de búsqueda
      const nombreNormalizado = this.normalizarTexto(nombreProducto);

      // Obtener todas las fichas técnicas con sus productos (agrupadas por producto para evitar duplicados)
      const query = `
        SELECT 
          MIN(ft.id) as ficha_id,
          ft.prenda_id as producto_id,
          p.nombre as producto_nombre,
          p.codigo as producto_codigo,
          '' as producto_descripcion
        FROM fichas_tecnicas ft
        INNER JOIN prendas p ON ft.prenda_id = p.id
        WHERE p.activo = 1
        GROUP BY ft.prenda_id, p.nombre, p.codigo
      `;

      const [fichas] = await db.execute(query);

      // Calcular similitud para cada ficha técnica
      const fichasConScore = fichas.map(ficha => {
        const nombreFicha = this.normalizarTexto(ficha.producto_nombre);
        const descripcionFicha = ficha.producto_descripcion ?
          this.normalizarTexto(ficha.producto_descripcion) : '';
         
       

        // Calcular similitud con el nombre
        const scoreNombre = similarity.compareTwoStrings(nombreNormalizado, nombreFicha);

        // Calcular similitud con la descripción si existe
        const scoreDescripcion = descripcionFicha ?
          similarity.compareTwoStrings(nombreNormalizado, descripcionFicha) : 0;

        // Score combinado (70% nombre, 30% descripción)
        const scoreFinal = (scoreNombre * 0.7) + (scoreDescripcion * 0.3);

        // Verificar si el nombre base contiene palabras clave del producto
        const palabrasClave = this.extraerPalabrasClave(nombreNormalizado);
        const palabrasFicha = this.extraerPalabrasClave(nombreFicha);
        const palabrasComunes = palabrasClave.filter(p => palabrasFicha.includes(p));
        const bonusPalabras = palabrasComunes.length / Math.max(palabrasClave.length, 1) * 0.2;

        return {
          ...ficha,
          score: Math.min(1, scoreFinal + bonusPalabras),
          palabras_coincidentes: palabrasComunes
        };
      });

      // Ordenar por score descendente y limitar resultados
      const fichasOrdenadas = fichasConScore
        .filter(f => f.score > 0.1) // Filtrar scores muy bajos
        .sort((a, b) => b.score - a.score)
        .slice(0, limite);

      return fichasOrdenadas;
    } catch (error) {
      console.error('Error en buscarFichasTecnicas:', error);
      return [];
    }
  }

  /**
   * Normaliza un texto para comparación
   */
  static normalizarTexto(texto) {
    if (!texto) return '';
    return texto
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^A-Z0-9\s]/g, ' ') // Eliminar caracteres especiales
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Extrae palabras clave significativas de un texto
   */
  static extraerPalabrasClave(texto) {
    const palabrasExcluidas = [
      'DE', 'LA', 'EL', 'Y', 'O', 'A', 'EN', 'UN', 'UNA', 'PARA', 'POR', 'CON',
      'SIN', 'SOBRE', 'TIPO', 'MODELO', 'ESTILO', 'COLOR', 'TALLA', 'SIZE'
    ];

    const palabras = texto.split(/\s+/)
      .filter(p => p.length > 2) // Palabras de más de 2 caracteres
      .filter(p => !palabrasExcluidas.includes(p));

    return palabras;
  }

  /**
   * Busca fichas técnicas para múltiples productos
   * @param {Array} productos - Array de objetos con {nombre_base, item_numero}
   * @returns {Object} Objeto con item_numero como clave y array de fichas como valor
   */
  static async buscarFichasParaMultiplesProductos(productos) {
    const resultados = {};

    for (const producto of productos) {
      if (producto.nombre_base) {
        resultados[producto.item_numero] = await this.buscarFichasTecnicas(
          producto.nombre_base,
          5 // Limitar a 5 resultados por producto
        );
      }
    }

    return resultados;
  }
}

module.exports = FichaTecnicaMatcher;
