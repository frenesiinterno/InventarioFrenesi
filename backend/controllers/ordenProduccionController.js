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

    // Crear la orden
    const ordenId = await OrdenProduccionModel.create({
      numero_orden: datosParseados.numero_orden,
      producto_id: productoId,
      cantidad_producir: cantidadTotal,
      fecha_orden: datosParseados.fecha_expedicion,
      estado: 'pendiente',
      observaciones: observacionesStr
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

// Validar si una orden puede ser costeada
exports.validarOrdenParaCosteo = async (req, res) => {
  try {
    const { id } = req.params;
    const CostoPrendaService = require('../services/costoPrendaService');
    const FichaTecnicaModel = require('../models/FichaTecnicaModel');

    // Obtener orden y sus items
    const orden = await OrdenProduccionModel.getById(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const items = await OpItemModel.getByOrdenId(id);
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        puede_costear: false,
        errores: ['La orden no tiene items para procesar']
      });
    }

    const errores = [];
    const itemsValidos = [];

    // Validar cada item
    for (const item of items) {
      if (!item.producto_id) {
        errores.push(`Item "${item.referencia_prenda}": No tiene producto asignado`);
        continue;
      }

      // Verificar que el producto tenga ficha técnica
      const fichaTecnica = await FichaTecnicaModel.getByPrendaId(item.producto_id);
      if (!fichaTecnica || fichaTecnica.length === 0) {
        errores.push(`Producto "${item.referencia_prenda}": No tiene ficha técnica definida`);
        continue;
      }

      // Verificar stock suficiente
      try {
        const verificacionStock = await CostoPrendaService.verificarStockPrenda(item.producto_id, item.cantidad);
        if (!verificacionStock.suficiente_stock) {
          verificacionStock.faltantes.forEach(faltante => {
            errores.push(`Stock insuficiente: ${faltante.nombre_materia} (requerido: ${faltante.requerido}, disponible: ${faltante.disponible})`);
          });
          continue;
        }
      } catch (error) {
        errores.push(`Error verificando stock para "${item.referencia_prenda}": ${error.message}`);
        continue;
      }

      itemsValidos.push(item);
    }

    const puedeCostear = errores.length === 0;

    res.json({
      success: true,
      puede_costear: puedeCostear,
      errores: errores,
      estadisticas: {
        total_items: items.length,
        items_validos: itemsValidos.length,
        items_con_errores: errores.length
      }
    });

  } catch (error) {
    console.error('Error validando orden:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      puede_costear: false,
      errores: ['Error interno del servidor']
    });
  }
};

// Procesar orden completa (costear) - solo costos, no precios
exports.procesarOrdenCompleta = async (req, res) => {
  try {
    const { id } = req.params;
    const CostoPrendaService = require('../services/costoPrendaService');
    const KardexModel = require('../models/KardexModel');
    const OrdenProduccionPDFService = require('../services/ordenProduccionPDFService');

    // Obtener orden y sus items
    const orden = await OrdenProduccionModel.getById(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const items = await OpItemModel.getByOrdenId(id);
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La orden no tiene items para procesar'
      });
    }

    // Validar que la orden pueda ser costeada
    const validacion = await this.validarOrdenParaCosteo({ params: { id } }, {
      json: () => {},
      status: () => ({ json: () => {} })
    });

    if (!validacion.puede_costear) {
      return res.status(400).json({
        success: false,
        message: 'La orden no puede ser costeada',
        errores: validacion.errores
      });
    }

    // Calcular costos usando el nuevo servicio
    const prendasParaCalculo = items.map(item => ({
      prenda_id: item.producto_id,
      cantidad: item.cantidad
    }));

    const calculoOrden = await CostoPrendaService.calcularCostoOrden(id, prendasParaCalculo);

    // Procesar consumos y registrar en Kardex
    const connection = await require('../database/db').getConnection();
    try {
      await connection.beginTransaction();

      // Crear registro de consumos agrupados
      const ordenConsumos = [];
      for (const detallePrenda of calculoOrden.detalles_prendas) {
        for (const materia of detallePrenda.detalles_materias) {
          // Registrar consumo en orden_consumos
          await connection.execute(
            `INSERT INTO orden_consumos (orden_id, materia_prima_id, cantidad, unidad)
             VALUES (?, ?, ?, ?)`,
            [id, materia.materia_prima_id, materia.consumo_total, materia.unidad]
          );

          // Registrar salida en Kardex usando PEPS
          await KardexModel.registrarSalidaOrden({
            orden_id: id,
            materia_prima_id: materia.materia_prima_id,
            cantidad: materia.consumo_total,
            fecha: new Date()
          });

          ordenConsumos.push({
            materia_prima_id: materia.materia_prima_id,
            nombre_materia: materia.nombre_materia,
            cantidad_consumida: materia.consumo_total,
            costo_total: materia.costo_total_materia
          });
        }
      }

      // Actualizar costos en ordenes_items
      for (const detallePrenda of calculoOrden.detalles_prendas) {
        const itemCorrespondiente = items.find(item => item.producto_id === detallePrenda.prenda_id);
        if (itemCorrespondiente) {
          await connection.execute(
            `UPDATE ordenes_items SET costo_unitario = ?, costo_total = ? WHERE id = ?`,
            [detallePrenda.costo_unitario, detallePrenda.costo_total, itemCorrespondiente.id]
          );
        }
      }

      // Actualizar estado de la orden
      await connection.execute(
        `UPDATE ordenes_produccion SET estado = 'costeada' WHERE id = ?`,
        [id]
      );

      await connection.commit();

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // Generar PDF con costos calculados
    const itemsConCostos = items.map(item => {
      const detallePrenda = calculoOrden.detalles_prendas.find(dp => dp.prenda_id === item.producto_id);
      return {
        ...item,
        costo_unitario: detallePrenda ? detallePrenda.costo_unitario : 0,
        costo_total: detallePrenda ? detallePrenda.costo_total : 0,
        detalles_costos: detallePrenda ? detallePrenda.detalles_materias : []
      };
    });

    const pdfBuffer = await OrdenProduccionPDFService.generarPDFOrden(
      orden,
      itemsConCostos,
      {
        nombre: 'DISEÑOS Y TEXTILES FRENESI S.A.S',
        nit: '900726418',
        direccion: 'Calle 10A NO. 39-105 B/DEPARTAMENTAL',
        ciudad: 'Cali',
        telefono: '+573183542386',
        email: 'contabilidad@frenesi.com.co'
      }
    );

    // Guardar PDF en disco
    const pdfInfo = await OrdenProduccionPDFService.guardarPDFEnDisco(
      pdfBuffer,
      orden.numero_orden || `OP-${id}`
    );

    // Actualizar rutas PDF en items
    for (const item of items) {
      await OpItemModel.actualizarRutaPDF(item.id, pdfInfo.rutaRelativa);
    }

    res.json({
      success: true,
      message: 'Orden costeada exitosamente',
      data: {
        orden_id: id,
        numero_orden: orden.numero_orden,
        estado: 'costeada',
        pdf: {
          nombre: pdfInfo.nombreArchivo,
          url: pdfInfo.rutaRelativa,
          ruta: pdfInfo.rutaCompleta
        },
        resumen_costos: {
          costo_total_orden: calculoOrden.costo_total_orden,
          cantidad_prendas_total: calculoOrden.detalles_prendas.reduce((sum, dp) => sum + dp.cantidad, 0),
          costo_promedio_por_prenda: calculoOrden.costo_total_orden / calculoOrden.detalles_prendas.reduce((sum, dp) => sum + dp.cantidad, 0)
        },
        consumos: ordenConsumos,
        items: itemsConCostos.map(item => ({
          id: item.id,
          referencia_prenda: item.referencia_prenda,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario,
          costo_total: item.costo_total
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
