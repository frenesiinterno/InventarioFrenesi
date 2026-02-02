const OrdenProduccionModel = require('../models/OrdenProduccionModel');
const OpItemModel = require('../models/OpItemModel');
const { parsearPDFOrden } = require('../services/pdfParserService');
const { procesarItemsConMatching } = require('../services/productoMatchingService');

const parseEntero = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.trunc(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '');
    const parsed = parseInt(cleaned, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

// Obtener todas las órdenes
exports.getAll = async (req, res) => {
  try {
    const ordenes = await OrdenProduccionModel.getAll();
    res.json({ success: true, data: ordenes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener orden por ID con sus items
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const orden = await OrdenProduccionModel.getById(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    // Obtener items de la orden
    const items = await OpItemModel.getByOrdenId(id);
    const stats = await OpItemModel.getStatsByOrdenId(id);
    
    res.json({ 
      success: true, 
      data: {
        ...orden,
        items: items,
        estadisticas: stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear nueva orden
exports.create = async (req, res) => {
  try {
    const { numero_orden, producto_id, cantidad_producir, fecha_orden, estado, observaciones } = req.body;

    const cantidadParseada = parseEntero(cantidad_producir);
    const productoIdNumber = producto_id ? Number(producto_id) : null;

    if (
      !numero_orden ||
      !fecha_orden ||
      (cantidadParseada !== null && cantidadParseada <= 0)
    ) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan campos requeridos: numero_orden, fecha_orden. cantidad_producir debe ser un entero positivo si se proporciona.' 
      });
    }

    // Validar que producto_id sea válido si se proporciona
    if (producto_id && (Number.isNaN(productoIdNumber) || productoIdNumber <= 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'producto_id debe ser un número válido' 
      });
    }

    const id = await OrdenProduccionModel.create({
      numero_orden,
      producto_id: productoIdNumber,
      cantidad_producir: cantidadParseada || 0,
      fecha_orden,
      estado: estado || 'pendiente',
      observaciones: observaciones || null
    });

    res.status(201).json({ success: true, data: { id }, message: 'Orden de producción creada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: `La orden ${req.body.numero_orden} ya existe en el sistema` 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar orden
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_orden, producto_id, cantidad_producir, fecha_orden, estado, observaciones } = req.body;
    const cantidadParseada = parseEntero(cantidad_producir);
    const productoIdNumber = Number(producto_id);

    if (cantidadParseada === null || cantidadParseada <= 0 || Number.isNaN(productoIdNumber)) {
      return res.status(400).json({
        success: false,
        message: 'cantidad_producir debe ser un entero positivo y producto_id válido'
      });
    }

    const updated = await OrdenProduccionModel.update(id, {
      numero_orden,
      producto_id: productoIdNumber,
      cantidad_producir: cantidadParseada,
      fecha_orden,
      estado,
      observaciones: observaciones || null
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    res.json({ success: true, message: 'Orden actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar orden
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await OrdenProduccionModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    res.json({ success: true, message: 'Orden eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Procesar orden (descontar materiales)
exports.procesar = async (req, res) => {
  try {
    const { id } = req.params;
    await OrdenProduccionModel.procesarOrden(id);
    res.json({ success: true, message: 'Orden procesada exitosamente. Materiales descontados.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cargar y procesar PDF de orden de producción
exports.cargarPDF = async (req, res) => {
  try {
    console.log('📄 Cargando PDF - req.file:', req.file ? { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'null');
    
    if (!req.file) {
      console.error('❌ No se recibió archivo en req.file');
      return res.status(400).json({ success: false, message: 'No se proporcionó ningún archivo PDF. Asegúrate de seleccionar un archivo.' });
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('❌ El buffer del archivo está vacío');
      return res.status(400).json({ success: false, message: 'El archivo PDF está vacío o no se pudo leer correctamente.' });
    }

    console.log('📖 Parseando PDF...');
    // Parsear el PDF
    const datosParseados = await parsearPDFOrden(req.file.buffer);
    console.log('✅ PDF parseado - Número orden:', datosParseados.numero_orden, 'Items encontrados:', datosParseados.items?.length || 0);

    if (!datosParseados.numero_orden) {
      console.error('❌ No se pudo identificar el número de orden en el PDF');
      return res.status(400).json({ 
        success: false, 
        message: 'No se pudo identificar el número de orden en el PDF. Verifica que el PDF tenga el formato correcto (debe contener "OP" seguido de números, ej: "OP5393").',
        detalles: 'El parser buscó patrones como "No. OP5393", "Orden OP5393", "OP 5393", etc.'
      });
    }

    if (!datosParseados.items || datosParseados.items.length === 0) {
      console.error('❌ No se encontraron items en el PDF. Datos parseados:', JSON.stringify(datosParseados, null, 2));
      return res.status(400).json({ 
        success: false, 
        message: 'No se encontraron items en el PDF. Verifica que el PDF contenga una tabla con referencias de prendas, precios y cantidades.',
        detalles: 'El parser busca items con formato: "REFERENCIA / TALLA / DISEÑO (CODIGO) | PRECIO | CANTIDAD"'
      });
    }

    // Verificar que la tabla op_items existe antes de continuar
    try {
      await OpItemModel.getByOrdenId(0); // Intentar una consulta simple para verificar que la tabla existe
    } catch (dbError) {
      if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes('op_items')) {
        console.error('❌ La tabla op_items no existe. Ejecuta la migración: npm run migrate:op-items');
        return res.status(500).json({
          success: false,
          message: 'La tabla op_items no existe. Por favor, ejecuta la migración primero.',
          instrucciones: 'Ejecuta el comando: npm run migrate:op-items'
        });
      }
      throw dbError; // Re-lanzar si es otro tipo de error
    }
    
    console.log('🔄 Procesando items con matching de productos...');
    // Procesar items con matching de productos
    const itemsProcesados = await procesarItemsConMatching(datosParseados.items);
    console.log('✅ Items procesados:', itemsProcesados.length);
    
    // Calcular cantidad total
    const cantidadTotal = itemsProcesados.reduce((sum, item) => sum + (item.cantidad || 0), 0);

    // Determinar producto_id (usar el primero que tenga match exacto, o el primero en general)
    // Si no hay ningún producto, usar el primero de la base de datos como referencia temporal
    const productoExacto = itemsProcesados.find(item => item.producto_match_type === 'exacto');
    let productoId = productoExacto ? productoExacto.producto_id : 
                      (itemsProcesados.find(item => item.producto_id)?.producto_id || null);
    
    // Si aún no hay producto_id, obtener el primer producto disponible como referencia
    if (!productoId) {
      const ProductoModel = require('../models/ProductoModel');
      try {
        const productos = await ProductoModel.getAll();
        if (productos && productos.length > 0) {
          productoId = productos[0].id; // Usar el primero como referencia temporal
        }
      } catch (error) {
        console.error('Error al obtener producto por defecto:', error);
        // Continuar sin producto_id, la migración permitirá null
      }
    }

    // Verificar si la orden ya existe
    const ordenExistente = await OrdenProduccionModel.getByNumeroOrden(datosParseados.numero_orden);
    
    if (ordenExistente) {
      return res.status(400).json({ 
        success: false, 
        message: `La orden ${datosParseados.numero_orden} ya existe en el sistema`,
        data: {
          orden_id: ordenExistente.id,
          numero_orden: ordenExistente.numero_orden
        }
      });
    }

    // Construir observaciones con información adicional
    let observaciones = [];
    if (datosParseados.cliente) observaciones.push(`Cliente: ${datosParseados.cliente}`);
    if (datosParseados.responsable) observaciones.push(`Responsable: ${datosParseados.responsable}`);
    if (datosParseados.stock) observaciones.push(`Stock: ${datosParseados.stock}`);
    if (datosParseados.fecha_entrega) observaciones.push(`Fecha entrega: ${datosParseados.fecha_entrega}`);
    const observacionesStr = observaciones.length > 0 ? observaciones.join(' | ') : null;

    // Crear la orden (1 documento padre; los items se crean como hijos)
    const ordenId = await OrdenProduccionModel.create({
      numero_orden: datosParseados.numero_orden,
      producto_id: productoId,
      cantidad_producir: cantidadTotal,
      fecha_orden: datosParseados.fecha_expedicion,
      estado: 'pendiente',
      observaciones: observacionesStr,
      origen_pdf: req.file?.originalname || null
    });

    // Crear los items de la orden
    const itemsParaInsertar = itemsProcesados.map(item => ({
      orden_produccion_id: ordenId,
      producto_id: item.producto_id || null,
      referencia_prenda: item.referencia || item.referencia_completa || '',
      codigo_item: item.codigo || null,
      talla: item.talla || null,
      diseno: item.diseno || null,
      precio_unitario: item.precio || null,
      cantidad: item.cantidad || 0,
      descuento: item.descuento || 0,
      total: item.total || null,
      producto_match_type: item.producto_match_type || 'no_encontrado',
      producto_sugerido_id: item.producto_sugerido_id || null,
      necesita_revision: item.necesita_revision || false
    }));

    await OpItemModel.createMultiple(itemsParaInsertar);

    // Obtener estadísticas
    const stats = await OpItemModel.getStatsByOrdenId(ordenId);
    const itemsGuardados = await OpItemModel.getByOrdenId(ordenId);

    res.status(201).json({
      success: true,
      message: 'Orden de producción creada exitosamente desde PDF',
      data: {
        orden_id: ordenId,
        numero_orden: datosParseados.numero_orden,
        total_items: itemsGuardados.length,
        items_exactos: stats.items_exactos,
        items_similares: stats.items_similares,
        items_no_encontrados: stats.items_no_encontrados,
        items_revision: stats.items_revision,
        items: itemsGuardados
      }
    });
  } catch (error) {
    console.error('❌ Error al procesar PDF:', error);
    console.error('Stack trace:', error.stack);
    
    // Si es un error de parsing, devolver 400 en lugar de 500
    if (error.message.includes('parsear PDF') || error.message.includes('parsear')) {
      return res.status(400).json({ 
        success: false, 
        message: `Error al procesar el PDF: ${error.message}`,
        detalles: 'Por favor, verifica que el PDF tenga un formato válido de orden de producción.'
      });
    }
    
    // Si es un error de base de datos (tabla no existe, etc)
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('op_items')) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error: La tabla op_items no existe. Ejecuta la migración primero: npm run migrate:op-items',
        error: error.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: `Error al procesar el PDF: ${error.message}`,
      detalles: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Obtener items de una orden
exports.getItems = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await OpItemModel.getByOrdenId(id);
    const stats = await OpItemModel.getStatsByOrdenId(id);
    
    res.json({ 
      success: true, 
      data: {
        items: items,
        estadisticas: stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Procesar orden completa: 1 documento = 1 OP. Items como hijos. PEPS real y consumo trazable.
exports.procesarOrdenCompleta = async (req, res) => {
  const db = require('../database/db');
  const FichaTecnicaModel = require('../models/FichaTecnicaModel');
  const KardexModel = require('../models/KardexModel');
  const OrdenProduccionConsumoMPModel = require('../models/OrdenProduccionConsumoMPModel');
  const OrdenProduccionPDFService = require('../services/ordenProduccionPDFService');

  try {
    const { id } = req.params;
    const ordenId = parseInt(id, 10);

    const orden = await OrdenProduccionModel.getById(ordenId);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const items = await OpItemModel.getByOrdenId(ordenId);
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La orden no tiene items para procesar'
      });
    }

    // Validar: ficha asignada (producto_id) y cantidad > 0
    const itemsSinProducto = items.filter(i => !i.producto_id);
    if (itemsSinProducto.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${itemsSinProducto.length} item(s) no tienen producto/ficha asignada. Asigna producto a todos los items antes de procesar.`,
        itemsSinProducto: itemsSinProducto.map(i => ({ id: i.id, referencia: i.referencia_prenda }))
      });
    }
    const itemsSinCantidad = items.filter(i => !(i.cantidad > 0));
    if (itemsSinCantidad.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Todos los items deben tener cantidad > 0.'
      });
    }

    const empresa = {
      nombre: 'DISEÑOS Y TEXTILES FRENESI S.A.S',
      nit: '900726418',
      direccion: 'Calle 10A NO. 39-105 B/DEPARTAMENTAL',
      ciudad: 'Cali',
      telefono: '+573183542386',
      email: 'contabilidad@frenesi.com.co'
    };

    let totalCostoMPOrden = 0;
    const itemsConCostos = [];

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      for (const item of items) {
        const fichaRows = await FichaTecnicaModel.getByProducto(item.producto_id);
        if (!fichaRows || fichaRows.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: `El producto del item "${item.referencia_prenda}" no tiene ficha técnica.`
          });
        }

        let costoItemTotal = 0;
        const detallesCostos = [];

        for (const ficha of fichaRows) {
          const cantidadNecesaria = parseFloat(ficha.cantidad) * (item.cantidad || 0);
          if (cantidadNecesaria <= 0) continue;

          const resultado = await KardexModel.registrarSalidaConConexion(connection, {
            materia_prima_id: ficha.materia_prima_id,
            cantidad: cantidadNecesaria,
            referencia: 'OP',
            referencia_id: ordenId,
            motivo: 'Orden de producción',
            observaciones: `OP ${orden.numero_orden} - Item ${item.id} - ${(item.referencia_prenda || '').substring(0, 80)}`
          });

          await OrdenProduccionConsumoMPModel.createWithConnection(connection, {
            orden_produccion_item_id: item.id,
            materia_prima_id: ficha.materia_prima_id,
            cantidad_consumida: cantidadNecesaria,
            costo_unitario_peps: resultado.costo_unitario,
            costo_total: resultado.costo_total
          });

          costoItemTotal += resultado.costo_total;
          detallesCostos.push({
            materia_prima_id: ficha.materia_prima_id,
            materia_nombre: ficha.materia_nombre,
            cantidad_total_necesaria: cantidadNecesaria,
            costo_unitario: resultado.costo_unitario,
            costo_material: resultado.costo_total
          });
        }

        const cantidadItem = item.cantidad || 1;
        const precioUnitarioCalculado = cantidadItem > 0 ? costoItemTotal / cantidadItem : 0;
        const totalCalculado = costoItemTotal;
        totalCostoMPOrden += costoItemTotal;

        await connection.execute(
          `UPDATE op_items SET 
           costo_materia_prima = ?, precio_calculado = ?, total_calculado = ?, detalles_costos = ?,
           procesado = TRUE, fecha_procesamiento = NOW()
           WHERE id = ?`,
          [costoItemTotal, precioUnitarioCalculado, totalCalculado, JSON.stringify(detallesCostos), item.id]
        );

        itemsConCostos.push({
          ...item,
          costo_materia_prima: costoItemTotal,
          precio_calculado: precioUnitarioCalculado,
          total_calculado: totalCalculado,
          detalles_costos: detallesCostos
        });
      }

      await connection.execute(
        `UPDATE ordenes_produccion SET estado = 'completada', total_costo_mp = ? WHERE id = ?`,
        [totalCostoMPOrden, ordenId]
      );

      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      connection.release();
      throw txError;
    }
    connection.release();

    // Generar un único PDF por orden: OP-5546-COSTEADA.pdf
    const pdfBuffer = await OrdenProduccionPDFService.generarPDFOrden(orden, itemsConCostos, empresa);
    const pdfInfo = await OrdenProduccionPDFService.guardarPDFEnDisco(pdfBuffer, orden.numero_orden, true);
    await OrdenProduccionModel.update(ordenId, { pdf_ruta: pdfInfo.rutaRelativa });

    const resumenCostos = await OpItemModel.getResumenCostosOrden(ordenId);

    const resumen = {
      total_items: resumenCostos.total_items,
      cantidad_total: resumenCostos.cantidad_total,
      costo_total_materia_prima: parseFloat(resumenCostos.costo_total_materia || 0),
      total_calculado: parseFloat(resumenCostos.total_calculado || 0),
      total_original: parseFloat(resumenCostos.total_original || 0),
      items_procesados: resumenCostos.items_procesados
    };

    res.json({
      success: true,
      message: 'Orden procesada exitosamente. Documento y consumos PEPS registrados.',
      data: {
        orden_id: ordenId,
        numero_orden: orden.numero_orden,
        estado: 'completada',
        estado_orden: 'completada',
        total_items: resumen.total_items,
        items_procesados: resumen.items_procesados,
        cantidad_total: resumen.cantidad_total,
        costo_total_materias: resumen.costo_total_materia_prima,
        precio_total_calculado: resumen.total_calculado,
        pdf_generado: true,
        pdf_ruta: pdfInfo.rutaRelativa,
        pdf: {
          nombre: pdfInfo.nombreArchivo,
          url: pdfInfo.rutaRelativa,
          ruta: pdfInfo.rutaCompleta
        },
        resumen,
        items: itemsConCostos.map(item => ({
          id: item.id,
          referencia_prenda: item.referencia_prenda,
          cantidad: item.cantidad,
          precio_original: item.precio_unitario,
          precio_calculado: item.precio_calculado,
          total_original: item.total,
          total_calculado: item.total_calculado
        })),
        items_detalles: itemsConCostos.map(item => ({
          producto_nombre: item.producto_nombre || item.referencia_prenda,
          cantidad: item.cantidad,
          costo_materia_prima: item.costo_materia_prima,
          precio_calculado: item.precio_calculado,
          total_calculado: item.total_calculado
        }))
      }
    });
  } catch (error) {
    console.error('Error procesando orden completa:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      detalles: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
