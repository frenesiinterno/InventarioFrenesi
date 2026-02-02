const pdf = require('pdf-parse');
const fs = require('fs');

/**
 * Parsea un PDF de orden de compra de SIIGO
 * Extrae: número OC, fecha, cliente, items con descripciones
 */
class PDFParser {
  static async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      const texto = data.text;
      const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      // Extraer número de OC
      const numeroOcMatch = texto.match(/No\.\s*OC-[\d-]+/i) ||
        texto.match(/OC[:\s-]*([\d-]+)/i) ||
        texto.match(/Orden\s+de\s+Compra[:\s]*([\d-]+)/i);
      const numeroOc = numeroOcMatch ? numeroOcMatch[0].replace(/No\.\s*/i, '').trim() : null;

      // Extraer fecha
      const fechaMatch = texto.match(/Fecha[:\s]*(\d{4}-\d{2}-\d{2})/i) ||
        texto.match(/(\d{4}-\d{2}-\d{2})/);
      const fechaOc = fechaMatch ? fechaMatch[1] : new Date().toISOString().split('T')[0];

      // Extraer información del cliente
      const clienteMatch = texto.match(/Para[:\s]*([^\n]+)/i);
      const clienteNombre = clienteMatch ? clienteMatch[1].trim() : null;

      const nitMatch = texto.match(/Nit[:\s]*([\d.-]+)/i);
      const clienteNit = nitMatch ? nitMatch[1].trim() : null;

      // Extraer totales
      const totalBrutoMatch = texto.match(/Total\s+Bruto[:\s]*([\d.,]+)/i);
      const totalBruto = totalBrutoMatch ? parseFloat(totalBrutoMatch[1].replace(/[,]/g, '')) : 0;

      const descuentosMatch = texto.match(/Descuentos[:\s]*([\d.,]+)/i);
      const descuentos = descuentosMatch ? parseFloat(descuentosMatch[1].replace(/[,]/g, '')) : 0;

      const subtotalMatch = texto.match(/Subtotal[:\s]*([\d.,]+)/i);
      const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/[,]/g, '')) : 0;

      const totalPagarMatch = texto.match(/Total\s+a\s+Pagar[:\s]*([\d.,]+)/i);
      const totalPagar = totalPagarMatch ? parseFloat(totalPagarMatch[1].replace(/[,]/g, '')) : 0;

      // Extraer items de la tabla
      const items = this.extraerItems(texto, lineas);

      return {
        numero_oc: numeroOc,
        fecha_oc: fechaOc,
        cliente_nombre: clienteNombre,
        cliente_nit: clienteNit,
        total_bruto: totalBruto,
        descuentos: descuentos,
        subtotal: subtotal,
        total_pagar: totalPagar,
        items: items
      };
    } catch (error) {
      throw new Error(`Error al parsear PDF: ${error.message}`);
    }
  }

  /**
   * Extrae items de la tabla del PDF
   * Busca patrones como: Ítem | Descripción | Cantidad | Vr. Unitario | ...
   */
  static extraerItems(texto, lineas) {
    const items = [];

    // 0) Intento especial para PDFs SIIGO (oc.pdf) donde NO hay separadores tipo "|" y
    // las columnas salen una debajo de otra:
    // ÍtemDescripciónCantidad ... luego:
    // 1
    // DESCRIPCIÓN (multi-línea)
    // 1.000.000.000 %0 %0.00  (aquí el PDF pegó números, pero el primer "1.00" es la cantidad)
    const idxHeaderSiigo = lineas.findIndex(l =>
      /ÍtemDescripciónCantidad/i.test(l) ||
      /ItemDescripcionCantidad/i.test(l) ||
      /Ítem\s*Descripción\s*Cantidad/i.test(l) ||
      /Item\s*Descripcion\s*Cantidad/i.test(l)
    );
    if (idxHeaderSiigo !== -1) {
      let current = null;
      for (let i = idxHeaderSiigo + 1; i < lineas.length; i++) {
        const l = lineas[i].trim();
        if (!l) continue;

        if (/^Observaciones/i.test(l) || /^Total\s+Bruto/i.test(l) || /^Subtotal/i.test(l) || /^Total\s+a\s+Pagar/i.test(l)) {
          // cerrar último item si existe
          if (current && current.descripcion) items.push(current);
          current = null;
          break;
        }

        // Nuevo item: línea con solo número (ej: "1")
        const itemNumMatch = l.match(/^(\d{1,4})$/);
        if (itemNumMatch) {
          if (current && current.descripcion) items.push(current);
          current = {
            item_numero: parseInt(itemNumMatch[1], 10),
            descripcion: '',
            nombre_base: null,
            talla: null,
            diseno: null,
            cantidad: null,
            valor_unitario: 0,
            valor_total: 0
          };
          continue;
        }

        if (!current) continue;

        // Línea de cantidad: tomar el primer número con 2 decimales al inicio (ej: "1.00" de "1.000.000.000")
        const qtyMatch = l.match(/^(\d+)\.(\d{2})/);
        if (qtyMatch) {
          const qty = parseFloat(`${qtyMatch[1]}.${qtyMatch[2]}`);
          current.cantidad = qty;

          const { nombreBase, talla, diseno } = this.parsearDescripcion(current.descripcion);
          current.nombre_base = nombreBase;
          current.talla = talla;
          current.diseno = diseno;

          items.push(current);
          current = null;
          continue;
        }

        // Continuación de descripción
        current.descripcion = (current.descripcion ? `${current.descripcion} ` : '') + l;
      }

      if (items.length > 0) return items;
    }

    // 0.5) Patrón especial para PDFs tipo OP5556 donde viene:
    // "1VESTIDO DE BAÑO TRIANGLE+ / XL / FLORA1.000.000.000 %0 %0.00"
    // Formato: [número_item][DESCRIPCION / TALLA / DISEÑO][números pegados]
    // Estrategia: capturar el número inicial, luego todo hasta encontrar un patrón de números pegados
    const patronOP5556 = /^(\d{1,3})(.+?)\d+\.\d+\.\d+\.\d+\s*%/i;
    for (const rawLine of lineas) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      const m = line.match(patronOP5556);
      if (!m) continue;

      const itemNumero = parseInt(m[1], 10);
      let descripcionCompleta = (m[2] || '').trim();

      // Extraer cantidad: buscar el primer número decimal después de la descripción
      // En "FLORA1.000.000.000" el primer "1.00" es la cantidad
      const cantidadMatch = line.substring(m[0].length - 20).match(/(\d+\.\d{2})/);
      const cantidad = cantidadMatch ? parseFloat(cantidadMatch[1]) : 1.0;

      // Solo considerar líneas con descripciones válidas
      if (!descripcionCompleta || descripcionCompleta.length < 3) continue;

      const { nombreBase, talla, diseno } = this.parsearDescripcion(descripcionCompleta);

      items.push({
        item_numero: itemNumero,
        descripcion: descripcionCompleta,
        nombre_base: nombreBase,
        talla,
        diseno,
        cantidad,
        valor_unitario: 0,
        valor_total: 0,
        descuento: 0
      });
    }

    if (items.length > 0) return items;


    // 1) Intento especial para PDFs tipo OP (ej: OP5393) donde la línea viene "pegada":
    // "ENTERIZO ... (5393.1)0.00%$66,967.02.0$133,934.0"
    // Captura: descripcion, descuento%, $precio, cantidad, $total
    // Nota: En estos PDFs no hay separadores entre precio y cantidad: "$66,967.02.0$133,934.0"
    // Por eso se usa un patrón más estricto para dinero (con coma de miles y punto decimal).
    const patronMoney = '(?:\\d{1,3}(?:,\\d{3})*\\.\\d+)';
    const patronOPPegado = new RegExp(
      `^(.*?)` + // descripción completa (incluye / TALLA / DISEÑO (xxxx.x))
      `(\\d+\\.\\d+)%\\$` + // descuento (ej 0.00%)
      `(${patronMoney})` + // precio unitario (ej 66,967.0)
      `(\\d+\\.\\d+)\\$` + // cantidad (ej 2.0)
      `(${patronMoney})$` // total (ej 133,934.0)
    );
    for (const rawLine of lineas) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      const m = line.match(patronOPPegado);
      if (!m) continue;

      // La descripción útil es solo la parte antes del descuento/valores
      let descripcionCompleta = (m[1] || '').trim();
      const descuento = parseFloat((m[2] || '0').replace(/,/g, ''));
      const valorUnitario = parseFloat((m[3] || '0').replace(/,/g, ''));
      const cantidad = parseFloat((m[4] || '0').replace(/,/g, ''));
      const valorTotal = parseFloat((m[5] || '0').replace(/,/g, ''));

      // Solo considerar líneas con cantidades válidas
      if (!descripcionCompleta || Number.isNaN(cantidad) || cantidad <= 0) continue;

      // Limpiar la descripción para que NO se pegue el bloque de números
      // (en algunos PDFs el OCR puede duplicar fragmentos)
      // Si existe "(xxxx.x)" cortar ahí para vista clara
      const idxCierre = descripcionCompleta.lastIndexOf(')');
      if (idxCierre !== -1 && idxCierre > 5) {
        descripcionCompleta = descripcionCompleta.slice(0, idxCierre + 1).trim();
      }

      const { nombreBase, talla, diseno } = this.parsearDescripcion(descripcionCompleta);

      // Limpiar diseno: dejar hasta el último ')', si existe
      let disenoLimpio = diseno;
      if (disenoLimpio && disenoLimpio.includes(')')) {
        disenoLimpio = disenoLimpio.slice(0, disenoLimpio.lastIndexOf(')') + 1).trim();
      }

      items.push({
        item_numero: items.length + 1,
        descripcion: descripcionCompleta,
        nombre_base: nombreBase,
        talla,
        diseno: disenoLimpio,
        cantidad,
        valor_unitario: valorUnitario,
        valor_total: Number.isNaN(valorTotal) ? (cantidad * valorUnitario) : valorTotal,
        descuento
      });
    }

    if (items.length > 0) return items;

    // Buscar la sección de la tabla
    const tablaInicio = texto.indexOf('Ítem') !== -1 ? texto.indexOf('Ítem') :
      texto.indexOf('Item') !== -1 ? texto.indexOf('Item') : -1;

    if (tablaInicio === -1) return items;

    // Buscar patrones de filas de tabla
    // Formato esperado: número | descripción | cantidad | valor unitario | ...
    const patronFila = /(\d+)\s*[|]\s*([^|]+?)\s*[|]\s*([\d.,]+)\s*[|]\s*([\d.,]+)/i;

    // Dividir el texto en secciones y buscar items
    const secciones = texto.substring(tablaInicio).split(/\n+/);

    let itemActual = null;

    for (let i = 0; i < secciones.length; i++) {
      const linea = secciones[i].trim();

      // Buscar fila que empiece con número (item)
      const match = linea.match(/^(\d+)\s*[|]/);
      if (match) {
        // Si hay un item anterior sin completar, guardarlo
        if (itemActual && itemActual.descripcion) {
          items.push(itemActual);
        }

        const itemNumero = parseInt(match[1]);

        // Extraer columnas separadas por |
        const columnas = linea.split('|').map(c => c.trim());

        if (columnas.length >= 4) {
          const descripcion = columnas[1] || '';
          const cantidad = parseFloat((columnas[2] || '0').replace(/[,]/g, ''));
          const valorUnitario = parseFloat((columnas[3] || '0').replace(/[,]/g, ''));

          // Parsear descripción para extraer nombre base, talla y diseño
          const { nombreBase, talla, diseño } = this.parsearDescripcion(descripcion);

          itemActual = {
            item_numero: itemNumero,
            descripcion: descripcion,
            nombre_base: nombreBase,
            talla: talla,
            diseño: diseño,
            cantidad: cantidad,
            valor_unitario: valorUnitario,
            valor_total: cantidad * valorUnitario
          };
        }
      } else if (
        itemActual &&
        linea.length > 0 &&
        !linea.match(/^(Total|Subtotal|Descuentos|Observaciones|Elaborado\s+por)/i) &&
        !linea.includes('|')
      ) {
        // Continuación de la descripción (muy común en SIIGO: la celda de descripción viene en varias líneas)
        itemActual.descripcion += ' ' + linea;
        const { nombreBase, talla, diseno } = this.parsearDescripcion(itemActual.descripcion);
        itemActual.nombre_base = nombreBase;
        itemActual.talla = talla;
        itemActual.diseno = diseno;
      }
    }

    // Agregar el último item si existe
    if (itemActual && itemActual.descripcion) {
      items.push(itemActual);
    }

    // Si no encontramos items con el método anterior, intentar método alternativo
    if (items.length === 0) {
      // Buscar líneas que contengan descripciones de productos
      for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];

        // Buscar líneas que parezcan ser items (contienen palabras clave de prendas)
        if (linea.match(/ENTERIZO|CAMISETA|PANTALON|PANTAL[OÓ]N|SHORT|TOPS?|LEGGING|KRONO|KONA|VESTIDO|BA[ÑN]O|BA[ÑN]ADOR|BIKINI|TRIANGLE|CONJUNTO|BRASIER|CALZA|SUDADERA|CORTO|SIN\s+COSTURA/i) &&
          !linea.match(/Descripción|Cantidad|Valor|Total|Subtotal/i)) {

          // Buscar número de item en líneas anteriores
          let itemNumero = items.length + 1;
          for (let j = Math.max(0, i - 3); j < i; j++) {
            const numMatch = lineas[j].match(/^(\d+)\s*[|]/);
            if (numMatch) {
              itemNumero = parseInt(numMatch[1]);
              break;
            }
          }

          // Buscar cantidad y valor en líneas siguientes
          let cantidad = 1;
          let valorUnitario = 0;

          for (let j = i + 1; j < Math.min(lineas.length, i + 5); j++) {
            const cantMatch = lineas[j].match(/([\d.,]+)/);
            if (cantMatch && !lineas[j].match(/[%]/) && parseFloat(cantMatch[1].replace(/[,]/g, '')) > 0) {
              if (cantidad === 1) {
                cantidad = parseFloat(cantMatch[1].replace(/[,]/g, ''));
              } else if (valorUnitario === 0) {
                valorUnitario = parseFloat(cantMatch[1].replace(/[,]/g, ''));
              }
            }
          }

          const { nombreBase, talla, diseno } = this.parsearDescripcion(linea);

          items.push({
            item_numero: itemNumero,
            descripcion: linea,
            nombre_base: nombreBase,
            talla: talla,
            diseno: diseno,
            cantidad: cantidad,
            valor_unitario: valorUnitario,
            valor_total: cantidad * valorUnitario
          });
        }
      }
    }

    return items;
  }

  /**
   * Parsea la descripción de un producto para extraer:
   * - Nombre base (antes del primer /)
   * - Talla (después del primer /)
   * - Diseño/complemento (después del segundo /)
   * 
   * Ejemplo: "ENTERIZO TIPO KONA TRIATLON MUJER SIN COSTURA (CIERRE DELANTERO) / S / CYCLING FUCSIA"
   */
  static parsearDescripcion(descripcion) {
    const partes = descripcion.split('/').map(p => p.trim());

    let nombreBase = descripcion;
    let talla = null;
    let diseno = null;

    if (partes.length >= 2) {
      nombreBase = partes[0].trim();
      talla = partes[1].trim() || null;

      if (partes.length >= 3) {
        diseno = partes.slice(2).join(' / ').trim() || null;
      }
    }

    return {
      nombreBase: nombreBase,
      talla: talla,
      diseno: diseno
    };
  }
}

module.exports = PDFParser;
