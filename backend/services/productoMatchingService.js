const db = require('../database/db');

/**
 * Compara una referencia extraída del PDF con los productos existentes
 * Retorna el tipo de match y el producto sugerido
 */
async function buscarProductoPorReferencia(referencia) {
  if (!referencia || typeof referencia !== 'string') {
    return {
      matchType: 'no_encontrado',
      productoId: null,
      producto: null,
      confianza: 0
    };
  }

  // Normalizar la referencia para comparación
  const normalizar = (texto) => {
    return texto
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^A-Z0-9\s]/g, '') // Solo letras, números y espacios
      .replace(/\s+/g, ' ') // Múltiples espacios a uno
      .trim();
  };

  const referenciaNormalizada = normalizar(referencia);

  try {
    // 1. Búsqueda exacta (ignorando mayúsculas y acentos)
    const [exactos] = await db.execute(
      `SELECT id, nombre, codigo 
       FROM productos 
       WHERE UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
         nombre, 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'), 
         'á', 'A'), 'é', 'E'), 'í', 'I'), 'ó', 'O'), 'ú', 'U')) = ? 
       AND activo = 1
       LIMIT 1`,
      [referenciaNormalizada]
    );

    if (exactos.length > 0) {
      return {
        matchType: 'exacto',
        productoId: exactos[0].id,
        producto: exactos[0],
        confianza: 100
      };
    }

    // 2. Búsqueda por palabras clave principales (similaridad alta)
    // Extraer palabras clave principales (palabras de más de 4 caracteres)
    const palabrasClave = referenciaNormalizada
      .split(' ')
      .filter(p => p.length > 4)
      .slice(0, 5); // Máximo 5 palabras clave

    if (palabrasClave.length > 0) {
      const condiciones = palabrasClave.map(() => 
        `UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          nombre, 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'), 
          'á', 'A'), 'é', 'E'), 'í', 'I'), 'ó', 'O'), 'ú', 'U')) LIKE ?`
      ).join(' AND ');

      const params = palabrasClave.map(p => `%${p}%`);

      const [similares] = await db.execute(
        `SELECT id, nombre, codigo,
         CASE 
           WHEN UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
             nombre, 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'), 
             'á', 'A'), 'é', 'E'), 'í', 'I'), 'ó', 'O'), 'ú', 'U')) LIKE ? THEN 90
           ELSE 70
         END as confianza
         FROM productos 
         WHERE ${condiciones}
         AND activo = 1
         ORDER BY confianza DESC, nombre ASC
         LIMIT 5`,
        [...params, `%${palabrasClave[0]}%`]
      );

      if (similares.length > 0) {
        const mejor = similares[0];
        // Calcular confianza basada en porcentaje de palabras que coinciden
        const palabrasReferencia = referenciaNormalizada.split(' ');
        const palabrasProducto = normalizar(mejor.nombre).split(' ');
        const coincidencias = palabrasReferencia.filter(p => 
          palabrasProducto.some(pp => pp.includes(p) || p.includes(pp))
        );
        const confianza = Math.round((coincidencias.length / palabrasReferencia.length) * 100);

        if (confianza >= 60) {
          return {
            matchType: confianza >= 80 ? 'exacto' : 'similar',
            productoId: mejor.id,
            producto: mejor,
            confianza: confianza
          };
        }
      }
    }

    // 3. Búsqueda parcial (contiene palabras importantes)
    const palabrasImportantes = ['ENTERIZO', 'LICRA', 'CHAQUETA', 'CAMISETA', 'BLUSA', 'CHALECO', 'TOP', 'VESTIDO'];
    const palabraEncontrada = palabrasImportantes.find(p => referenciaNormalizada.includes(p));

    if (palabraEncontrada) {
      const [parciales] = await db.execute(
        `SELECT id, nombre, codigo
         FROM productos 
         WHERE UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
           nombre, 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U'), 
           'á', 'A'), 'é', 'E'), 'í', 'I'), 'ó', 'O'), 'ú', 'U')) LIKE ?
         AND activo = 1
         ORDER BY 
           CASE 
             WHEN nombre LIKE ? THEN 1
             WHEN nombre LIKE ? THEN 2
             ELSE 3
           END,
           nombre ASC
         LIMIT 3`,
        [`%${palabraEncontrada}%`, `${palabraEncontrada}%`, `%${palabraEncontrada}%`]
      );

      if (parciales.length > 0) {
        return {
          matchType: 'similar',
          productoId: parciales[0].id,
          producto: parciales[0],
          confianza: 50
        };
      }
    }

    // No se encontró ningún match
    return {
      matchType: 'no_encontrado',
      productoId: null,
      producto: null,
      confianza: 0
    };
  } catch (error) {
    console.error('Error en búsqueda de producto:', error);
    return {
      matchType: 'no_encontrado',
      productoId: null,
      producto: null,
      confianza: 0
    };
  }
}

/**
 * Procesa una lista de items y busca productos correspondientes
 */
async function procesarItemsConMatching(items) {
  const itemsProcesados = [];

  for (const item of items) {
    const referencia = item.referencia || item.referencia_completa;
    const match = await buscarProductoPorReferencia(referencia);

    itemsProcesados.push({
      ...item,
      producto_match_type: match.matchType,
      producto_id: match.productoId,
      producto_sugerido_id: match.productoId,
      producto_sugerido: match.producto,
      confianza_match: match.confianza,
      necesita_revision: match.confianza < 80 && match.matchType !== 'exacto'
    });
  }

  return itemsProcesados;
}

module.exports = {
  buscarProductoPorReferencia,
  procesarItemsConMatching
};
