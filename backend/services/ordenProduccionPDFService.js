const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Servicio para generar PDFs de órdenes de producción con costos calculados
 * Utiliza el mismo formato que el PDF original pero con precios actualizados
 */
class OrdenProduccionPDFService {
  /**
   * Genera PDF de orden de producción con costos de materia prima
   * @param {Object} orden - Datos de la orden
   * @param {Array} items - Items de la orden con costos calculados
   * @param {Object} empresa - Datos de la empresa (nombre, nit, dirección, etc.)
   * @returns {Buffer} Buffer del PDF generado
   */
  static async generarPDFOrden(orden, items, empresa = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'letter',
          margin: 50,
          bufferPages: true
        });

        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Datos por defecto de empresa
        const empresaData = {
          nombre: empresa.nombre || 'DISEÑOS Y TEXTILES FRENESI S.A.S',
          nit: empresa.nit || '900726418',
          direccion: empresa.direccion || 'Calle 10A NO. 39-105 B/DEPARTAMENTAL',
          ciudad: empresa.ciudad || 'Cali',
          telefono: empresa.telefono || '+573183542386',
          email: empresa.email || 'contabilidad@frenesi.com.co',
          ...empresa
        };

        // Encabezado
        this._dibujarEncabezado(doc, empresaData, orden);

        // Salto de línea
        doc.moveDown(0.5);

        // Datos de orden
        this._dibujarDatosOrden(doc, orden);

        doc.moveDown(0.5);

        // Tabla de items
        this._dibujarTablaItems(doc, items);

        // Resumen de costos
        doc.moveDown(1);
        this._dibujarResumenCostos(doc, items);

        // Pie de página
        this._dibujarPiePagina(doc, orden);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Dibuja el encabezado del PDF
   */
  static _dibujarEncabezado(doc, empresa, orden) {
    // Datos de empresa a la izquierda
    doc.fontSize(12).font('Helvetica-Bold').text(empresa.nombre, { width: 300 });
    doc.fontSize(9).font('Helvetica');
    doc.text(`NIT: ${empresa.nit}`);
    doc.text(empresa.direccion);
    doc.text(`${empresa.ciudad} - Colombia`);
    doc.text(`Tel: ${empresa.telefono}`);
    doc.text(`Email: ${empresa.email}`);

    // Título del documento a la derecha
    const x = 350;
    const y = doc.y - 100;
    
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .text('Orden de Producción', x, y, { width: 200, align: 'right' });
    
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .text(`No. ${orden.numero_orden}`, x, doc.y, { width: 200, align: 'right' });

    // Línea divisoria
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
  }

  /**
   * Dibuja los datos de la orden
   */
  static _dibujarDatosOrden(doc, orden) {
    const datos = [
      { label: 'Fecha:', valor: new Date(orden.fecha_orden).toLocaleDateString('es-CO') },
      { label: 'Estado:', valor: this._traducirEstado(orden.estado) }
    ];

    if (orden.observaciones) {
      datos.push({ label: 'Observaciones:', valor: orden.observaciones });
    }

    doc.fontSize(10);
    datos.forEach(dato => {
      doc.font('Helvetica-Bold').text(dato.label, { continued: true });
      doc.font('Helvetica').text(` ${dato.valor}`);
    });
  }

  /**
   * Dibuja la tabla de items
   */
  static _dibujarTablaItems(doc, items) {
    if (!items || items.length === 0) {
      doc.text('No hay items en esta orden');
      return;
    }

    // Encabezados
    const columnas = [
      { ancho: 40, titulo: 'Item' },
      { ancho: 150, titulo: 'Descripción' },
      { ancho: 50, titulo: 'Talla' },
      { ancho: 70, titulo: 'Diseño' },
      { ancho: 60, titulo: 'Cantidad' },
      { ancho: 70, titulo: 'V. Unitario' },
      { ancho: 70, titulo: 'Total' }
    ];

    let y = doc.y;
    const alturaFila = 20;
    const alturaCabecera = 30;

    // Fondo de cabecera
    doc.rect(50, y, 500, alturaCabecera).fillAndStroke('#E8E8E8', '#333333');
    
    // Texto de cabecera
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
    let x = 60;
    columnas.forEach(col => {
      doc.text(col.titulo, x, y + 8, { width: col.ancho - 10, align: 'center' });
      x += col.ancho;
    });

    doc.moveTo(50, y + alturaCabecera).lineTo(550, y + alturaCabecera).stroke();
    y += alturaCabecera + 5;

    // Filas de datos
    doc.font('Helvetica').fontSize(8);
    items.forEach((item, index) => {
      const precioUnitario = parseFloat(item.precio_calculado || item.precio_unitario || 0).toFixed(2);
      const total = parseFloat(item.total_calculado || item.total || 0).toFixed(2);
      const descripcion = item.referencia_prenda || 'N/A';

      x = 60;
      
      // Item número
      doc.text(String(index + 1), x, y, { width: 30, align: 'center' });
      x += 40;

      // Descripción (puede ser más larga)
      doc.text(descripcion.substring(0, 35), x, y, { width: 150 });
      x += 150;

      // Talla
      doc.text(item.talla || '-', x, y, { width: 50, align: 'center' });
      x += 50;

      // Diseño
      doc.text((item.diseno || '-').substring(0, 12), x, y, { width: 70 });
      x += 70;

      // Cantidad
      doc.text(String(item.cantidad || 0), x, y, { width: 60, align: 'right' });
      x += 60;

      // Valor Unitario
      doc.text(`$${precioUnitario}`, x, y, { width: 70, align: 'right' });
      x += 70;

      // Total
      doc.text(`$${total}`, x, y, { width: 70, align: 'right' });

      y += alturaFila;
    });

    // Línea final de tabla
    doc.moveTo(50, y).lineTo(550, y).stroke();
  }

  /**
   * Dibuja el resumen de costos
   */
  static _dibujarResumenCostos(doc, items) {
    let totalBruto = 0;
    let totalItems = 0;

    items.forEach(item => {
      const total = parseFloat(item.total_calculado || item.total || 0);
      totalBruto += total;
      totalItems += item.cantidad || 0;
    });

    doc.fontSize(10).font('Helvetica');
    
    const x = 300;
    let y = doc.y;
    const margenDerecho = 550;

    // Total Bruto
    doc.font('Helvetica').text('Total Bruto:', x, y);
    doc.font('Helvetica-Bold').text(`$${totalBruto.toFixed(2)}`, x + 150, y, { align: 'right' });
    y += 20;

    // Total Items
    doc.font('Helvetica').text('Total Items:', x, y);
    doc.text(String(totalItems), x + 150, y, { align: 'right' });
    y += 20;

    // Descuentos (0%)
    doc.font('Helvetica').text('Descuentos:', x, y);
    doc.text('0 %', x + 150, y, { align: 'right' });
    y += 20;

    // Impuesto Cargo (0%)
    doc.font('Helvetica').text('Impto. Cargo:', x, y);
    doc.text('0 %', x + 150, y, { align: 'right' });
    y += 20;

    // Impuesto Rete (0%)
    doc.font('Helvetica').text('Impto. Rete:', x, y);
    doc.text('0 %', x + 150, y, { align: 'right' });
    y += 25;

    // Subtotal
    doc.font('Helvetica').text('Subtotal:', x, y);
    doc.text(`$${totalBruto.toFixed(2)}`, x + 150, y, { align: 'right' });
    y += 20;

    // Total a Pagar (en caja)
    doc.rect(x - 10, y - 5, 220, 35)
      .fillAndStroke('#E8E8E8', '#333333');
    
    doc.fillColor('#000000')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Total a Pagar', x + 10, y + 5, { width: 140 });
    
    doc.fontSize(12)
      .text(`$${totalBruto.toFixed(2)}`, x + 10, y + 20, { width: 140, align: 'right' });
  }

  /**
   * Dibuja el pie de página
   */
  static _dibujarPiePagina(doc, orden) {
    const textoObservaciones = `Generada desde Sistema de Inventario Frenesi\nOC Original: ${orden.numero_orden}\nFecha: ${new Date().toLocaleString('es-CO')}`;

    doc.fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(textoObservaciones, 50, doc.height - 60, { width: 500, align: 'center' });
  }

  /**
   * Traduce el estado de la orden
   */
  static _traducirEstado(estado) {
    const estados = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return estados[estado] || estado;
  }

  /**
   * Guarda el PDF en disco y retorna la ruta
   */
  static async guardarPDFEnDisco(buffer, numeroOrden) {
    const uploadsDir = path.join(__dirname, '../..', 'uploads', 'ordenes_produccion');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const nombreArchivo = `OP_${numeroOrden}_${new Date().getTime()}.pdf`;
    const rutaCompleta = path.join(uploadsDir, nombreArchivo);

    return new Promise((resolve, reject) => {
      fs.writeFile(rutaCompleta, buffer, (err) => {
        if (err) reject(err);
        else resolve({
          rutaCompleta,
          nombreArchivo,
          rutaRelativa: `/uploads/ordenes_produccion/${nombreArchivo}`
        });
      });
    });
  }
}

module.exports = OrdenProduccionPDFService;
