const pdfParse = require('pdf-parse');

/**
 * Extrae la referencia de la prenda del formato: "REFERENCIA / TALLA / DISEÑO (CODIGO)"
 * Retorna: { referencia, talla, diseno, codigo }
 */
function extraerReferenciaPrenda(texto) {
  if (!texto || typeof texto !== 'string') {
    return null;
  }

  // Normalizar espacios
  texto = texto.trim();

  // Buscar el código entre paréntesis al final
  const codigoMatch = texto.match(/\(([^)]+)\)\s*$/);
  const codigo = codigoMatch ? codigoMatch[1].trim() : null;

  // Remover el código del texto
  let textoSinCodigo = texto.replace(/\([^)]+\)\s*$/, '').trim();

  // Dividir por "/"
  const partes = textoSinCodigo.split('/').map(p => p.trim());
  
  if (partes.length === 0) {
    return null;
  }

  const referencia = partes[0] || null;
  const talla = partes.length > 1 ? partes[1] : null;
  const diseno = partes.length > 2 ? partes[2] : null;

  return {
    referencia: referencia || null,
    talla: talla || null,
    diseno: diseno || null,
    codigo: codigo || null
  };
}

/**
 * Parsea el PDF de una orden de producción
 * Retorna los datos estructurados de la orden
 */
async function parsearPDFOrden(buffer) {
  try {
    const data = await pdfParse(buffer);
    const texto = data.text;

    // Log para debug (solo primeros 500 caracteres)
    console.log('📄 Primeros 500 caracteres del PDF:', texto.substring(0, 500));

    // Extraer número de orden (ej: "No. OP5393", "OP5393", "Orden OP5393")
    const numeroOrdenMatch = texto.match(/No\.\s*OP?(\d+)/i) || 
                            texto.match(/Orden[^\d]*OP?(\d+)/i) ||
                            texto.match(/OP\s*(\d+)/i) ||
                            texto.match(/Orden[^\d]*(\d{4,})/i); // Fallback: buscar números de 4+ dígitos después de "Orden"
    const numeroOrden = numeroOrdenMatch ? `OP${numeroOrdenMatch[1]}` : null;
    
    if (!numeroOrden) {
      console.warn('⚠️ No se encontró número de orden. Buscando patrones alternativos...');
      // Intentar encontrar cualquier número después de "OP" o "ORDEN"
      const altMatch = texto.match(/(?:OP|ORDEN)\s*:?\s*(\d+)/i);
      if (altMatch) {
        console.log('✓ Encontrado número alternativo:', altMatch[1]);
      }
    }

    // Extraer fechas - buscar después de "FECHA DE EXPEDICIÓN" y "FECHA DE ENTREGA"
    const fechaExpedicionMatch = texto.match(/FECHA\s+DE\s+EXPEDICIÓN[^\d]*(\d{2}\/\d{2}\/\d{4})/i) || 
                                    texto.match(/FECHA.*EXPEDICIÓN[^\d]*(\d{2}\/\d{2}\/\d{4})/i);
    const fechaEntregaMatch = texto.match(/FECHA\s+DE\s+ENTREGA[^\d]*(\d{2}\/\d{2}\/\d{4})/i) || 
                              texto.match(/FECHA.*ENTREGA[^\d]*(\d{2}\/\d{2}\/\d{4})/i);

    // Convertir fecha DD/MM/YYYY a YYYY-MM-DD
    function convertirFecha(fechaStr) {
      if (!fechaStr) return null;
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const año = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
        return `${año}-${mes}-${dia}`;
      }
      return null;
    }

    const fechaExpedicion = convertirFecha(fechaExpedicionMatch ? fechaExpedicionMatch[1] : null);
    const fechaEntrega = convertirFecha(fechaEntregaMatch ? fechaEntregaMatch[1] : null);

    // Buscar la tabla de items usando regex más robusto
    // Formato: "Referencia / Ítem | Precio | Cantidad | Descuento | Total"
    const lineas = texto.split(/\r?\n/);
    const items = [];
    
    // Encontrar el inicio de la tabla (línea con "Referencia / Ítem" o "Referencia / Item")
    let inicioTabla = -1;
    for (let i = 0; i < lineas.length; i++) {
      const lineaLower = lineas[i].toLowerCase();
      if ((lineaLower.includes('referencia') || lineaLower.includes('referencia')) && 
          (lineaLower.includes('precio') || lineaLower.includes('ítem') || lineaLower.includes('item'))) {
        inicioTabla = i + 1;
        break;
      }
    }

    if (inicioTabla === -1) {
      inicioTabla = 0;
    }

    // Procesar las líneas para extraer items
    // Patrón: REFERENCIA / TALLA / DISEÑO (CODIGO) | PRECIO | CANTIDAD | DESCUENTO | TOTAL
    let encontradoTotal = false;
    for (let i = inicioTabla; i < lineas.length; i++) {
      let linea = lineas[i].trim();
      
      // Si encontramos total/subtotal, marcar para detener procesamiento
      if (linea.toLowerCase().includes('subtotal') || 
          (linea.toLowerCase().includes('total') && linea.match(/\$|\d/))) {
        encontradoTotal = true;
      }
      
      // Detener si encontramos total y ya procesamos items
      if (encontradoTotal && items.length > 0) {
        break;
      }
      
      // Saltar líneas vacías, headers, o totales
      if (!linea || 
          linea.length < 10 || // Muy corta para ser un item válido
          linea.toLowerCase().includes('referencia') && linea.toLowerCase().includes('precio') ||
          linea.toLowerCase().includes('subtotal') ||
          (linea.toLowerCase().includes('total') && !linea.match(/\d/) && !encontradoTotal) ||
          linea.toLowerCase().includes('descuento') ||
          linea.match(/^(Millón|Ciento|Doscientos|Trescientos|Cuatrocientos|Quinientos|Seiscientos|Setecientos|Ochocientos|Novecientos|Uno|Dos|Tres|Cuatro|Cinco|Seis|Siete|Ocho|Nueve|Diez).*pesos/i) ||
          linea.match(/^[^\w]*$/) || // Solo símbolos
          linea.match(/^---+/)) { // Líneas de separación
        continue;
      }

      // Buscar patrón con código entre paréntesis al final de la referencia
      // Ejemplo: "ENTERIZO MANGA CORTA KRONO / S / CAUTION PETROLEO (5393.1)"
      const codigoPattern = /\(([^)]+)\)\s*$/;
      const codigoMatch = linea.match(codigoPattern);
      
      let codigo = null;
      let referenciaPart = '';
      let datosPart = '';
      
      if (codigoMatch) {
        // Si tiene código entre paréntesis
        codigo = codigoMatch[1].trim();
        referenciaPart = linea.substring(0, codigoMatch.index).trim();
        datosPart = linea.substring(codigoMatch.index + codigoMatch[0].length).trim();
      } else {
        // Intentar sin código: buscar la primera ocurrencia de números (precio)
        // Patrón alternativo: "REFERENCIA / TALLA / DISEÑO  PRECIO  CANTIDAD"
        const precioMatch = linea.match(/(.+?)(\$\s*\d[\d,.]*|\d[\d,.]*\s*\$)/);
        if (precioMatch) {
          referenciaPart = precioMatch[1].trim();
          datosPart = linea.substring(precioMatch.index + precioMatch[1].length).trim();
        } else {
          // Último intento: dividir por múltiples espacios o tabs
          const partes = linea.split(/\s{3,}|\t/);
          if (partes.length >= 3) {
            referenciaPart = partes.slice(0, -2).join(' ').trim();
            datosPart = partes.slice(-2).join(' ').trim();
          } else {
            continue; // No se puede procesar esta línea
          }
        }
      }
      
      // Extraer referencia, talla y diseño
      let extraccion = codigo ? 
        extraerReferenciaPrenda(referenciaPart + ' (' + codigo + ')') :
        extraerReferenciaPrenda(referenciaPart);
      
      if (!extraccion || !extraccion.referencia) {
        // Si no se puede extraer, intentar usar toda la referenciaPart como referencia
        if (referenciaPart.length > 5) {
          const partes = referenciaPart.split('/').map(p => p.trim());
          extraccion = {
            referencia: partes[0] || referenciaPart,
            talla: partes.length > 1 ? partes[1] : null,
            diseno: partes.length > 2 ? partes[2] : null,
            codigo: codigo
          };
        } else {
          continue;
        }
      }
      
      if (!extraccion || !extraccion.referencia) continue;
      
      // Extraer precio, cantidad, descuento y total de la parte de datos
      // Usar múltiples espacios, tabs, o pipes como separadores
      const datosCols = datosPart.split(/\s{2,}|\t|\|/).filter(c => c.trim());
      
      // Intentar extraer valores numéricos
      const numeros = datosPart.match(/\$?[\d,]+\.?\d*/g) || [];
      
      let precio = null;
      let cantidad = 0;
      let descuento = 0;
      let total = null;
      
      if (numeros.length >= 2) {
        // El primer número es el precio, el segundo es la cantidad
        precio = parseFloat(numeros[0].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || null;
        cantidad = parseInt(numeros[1].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || 0;
        
        if (numeros.length >= 3) {
          // Puede ser descuento o total
          const tercerNum = parseFloat(numeros[2].replace(/[^\d,.\-]/g, '').replace(/,/g, '.'));
          if (tercerNum <= 100) {
            descuento = tercerNum; // Probablemente es porcentaje
            if (numeros.length >= 4) {
              total = parseFloat(numeros[3].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || null;
            }
          } else {
            total = tercerNum;
          }
        }
        
        if (numeros.length >= 4) {
          descuento = parseFloat(numeros[2].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || 0;
          total = parseFloat(numeros[3].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || null;
        }
        
        if (!total && precio && cantidad) {
          total = precio * cantidad * (1 - (descuento / 100));
        }
      } else if (datosCols.length >= 2) {
        // Intentar con columnas separadas (el guion debe ir al final para evitar interpretarlo como rango)
        precio = parseFloat(datosCols[0].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || null;
        cantidad = parseInt(datosCols[1].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || 0;
        if (datosCols.length >= 3) {
          descuento = parseFloat(datosCols[2].replace(/[^\d%.]/g, '').replace(/,/g, '.')) || 0;
        }
        if (datosCols.length >= 4) {
          total = parseFloat(datosCols[3].replace(/[^\d,.\-]/g, '').replace(/,/g, '.')) || null;
        }
        if (!total && precio && cantidad) {
          total = precio * cantidad * (1 - (descuento / 100));
        }
      }
      
      // Solo agregar si tenemos al menos referencia, precio y cantidad
      if (extraccion.referencia && precio !== null && cantidad > 0) {
        items.push({
          referencia_completa: referenciaPart,
          referencia: extraccion.referencia.trim(),
          talla: extraccion.talla ? extraccion.talla.trim() : null,
          diseno: extraccion.diseno ? extraccion.diseno.trim() : null,
          codigo: codigo,
          precio: precio,
          cantidad: cantidad,
          descuento: descuento,
          total: total
        });
      }
    }

    // Buscar información adicional (cliente, responsable, stock)
    const clienteMatch = texto.match(/CLIENTE[:\s]+([^\n|]+)/i);
    const responsableMatch = texto.match(/RESPONSABLE[:\s]+([^\n|]+)/i);
    const stockMatch = texto.match(/STOCK[:\s]*\*?\s*([^*\n|]+)/i);
    
    let cliente = clienteMatch ? clienteMatch[1].trim() : null;
    let responsable = responsableMatch ? responsableMatch[1].trim() : null;
    const stock = stockMatch ? stockMatch[1].trim() : null;
    
    // Si hay formato "CLIENTE: NOMBRE - RESPONSABLE: NOMBRE", separarlo
    if (cliente && cliente.includes('-')) {
      const partes = cliente.split('-').map(p => p.trim());
      if (partes.length >= 2) {
        cliente = partes[0].replace(/CLIENTE[:\s]*/i, '').trim();
        responsable = partes[1].replace(/RESPONSABLE[:\s]*/i, '').trim();
      }
    }

    const itemsFiltrados = items.filter(item => item.cantidad > 0);
    
    console.log(`📊 Resumen del parseo:
      - Número orden: ${numeroOrden || 'NO ENCONTRADO'}
      - Items encontrados: ${itemsFiltrados.length}
      - Fecha expedición: ${fechaExpedicion || 'NO ENCONTRADA'}
      - Cliente: ${cliente || 'NO ENCONTRADO'}
    `);
    
    if (itemsFiltrados.length > 0) {
      console.log('📝 Primeros items encontrados:');
      itemsFiltrados.slice(0, 3).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.referencia} - Cantidad: ${item.cantidad}, Precio: ${item.precio}`);
      });
    }

    return {
      numero_orden: numeroOrden,
      fecha_expedicion: fechaExpedicion || new Date().toISOString().split('T')[0],
      fecha_entrega: fechaEntrega,
      cliente: cliente,
      responsable: responsable,
      stock: stock,
      items: itemsFiltrados
    };
  } catch (error) {
    console.error('❌ Error en parsearPDFOrden:', error);
    throw new Error(`Error al parsear PDF: ${error.message}`);
  }
}

module.exports = {
  parsearPDFOrden,
  extraerReferenciaPrenda
};

