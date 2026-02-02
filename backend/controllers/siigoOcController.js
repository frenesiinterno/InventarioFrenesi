const SiigoOcModel = require('../models/SiigoOcModel');
const PDFParser = require('../services/pdfParser');
const FichaTecnicaMatcher = require('../services/fichaTecnicaMatcher');
const OrdenProduccionModel = require('../models/OrdenProduccionModel');
const KardexModel = require('../models/KardexModel');
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

// Obtener todas las OCs (agrupadas por numero_oc: una fila por orden)
exports.getAll = async (req, res) => {
  try {
    const ocs = await SiigoOcModel.getAllGroupedByNumeroOc();
    res.json({ success: true, data: ocs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener OC por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const oc = await SiigoOcModel.getById(id);
    if (!oc) {
      return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
    }
    res.json({ success: true, data: oc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Procesar PDF de SIIGO
exports.procesarPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo PDF' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Parsear PDF
    const datosOC = await PDFParser.parsePDF(filePath);

    if (!datosOC.numero_oc) {
      // Si no se encontró número de OC, generar uno
      datosOC.numero_oc = `OC-${Date.now()}`;
    }

    // Crear registro de OC
    const ocId = await SiigoOcModel.create({
      ...datosOC,
      pdf_path: filePath,
      pdf_original_name: fileName,
      estado: 'EN_PROCESO'
    });

    // Crear items
    for (const item of datosOC.items) {
      await SiigoOcModel.createItem({
        ...item,
        siigo_oc_id: ocId
      });
    }

    // Buscar fichas técnicas para cada item
    const itemsConFichas = {};
    for (const item of datosOC.items) {
      if (item.nombre_base) {
        const fichas = await FichaTecnicaMatcher.buscarFichasTecnicas(item.nombre_base, 5);
        itemsConFichas[item.item_numero] = fichas;
      }
    }

    // Obtener OC completa
    const oc = await SiigoOcModel.getById(ocId);

    res.json({
      success: true,
      data: {
        oc: oc,
        fichas_sugeridas: itemsConFichas
      },
      message: 'PDF procesado correctamente. Revise y asigne las fichas técnicas.'
    });
  } catch (error) {
    console.error('Error procesando PDF:', error);
    res.status(500).json({
      success: false,
      message: `Error al procesar PDF: ${error.message}`
    });
  }
};

// Asignar ficha técnica a un item
exports.asignarFichaTecnica = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { ficha_tecnica_id } = req.body;

    if (!ficha_tecnica_id) {
      return res.status(400).json({
        success: false,
        message: 'ficha_tecnica_id es requerido'
      });
    }

    await SiigoOcModel.asignarFichaTecnica(itemId, ficha_tecnica_id);

    res.json({
      success: true,
      message: 'Ficha técnica asignada correctamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Procesar item: agrupar en UNA orden de producción por OC (no una OP por ítem).
// Solo agrega el ítem a la OP; el descuento de materiales y PDF se hace en "Procesar Orden Completa".
exports.procesarItem = async (req, res) => {
  const OpItemModel = require('../models/OpItemModel');

  try {
    const { itemId } = req.params;
    const { referencia_prenda } = req.body;

    const [items] = await db.execute(
      `SELECT si.*, s.numero_oc, s.fecha_oc, s.cliente_nombre 
       FROM siigo_oc_items si
       INNER JOIN siigo_ocs s ON si.siigo_oc_id = s.id
       WHERE si.id = ?`,
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    const item = items[0];

    if (!item.ficha_tecnica_id) {
      return res.status(400).json({
        success: false,
        message: 'El item debe tener una ficha técnica asignada'
      });
    }

    const [fichas] = await db.execute(
      `SELECT ft.*, p.nombre as producto_nombre 
       FROM fichas_tecnicas ft
       INNER JOIN productos p ON ft.producto_id = p.id
       WHERE ft.id = ?`,
      [item.ficha_tecnica_id]
    );

    if (fichas.length === 0) {
      return res.status(404).json({ success: false, message: 'Ficha técnica no encontrada' });
    }

    const ficha = fichas[0];

    const [materiales] = await db.execute(
      `SELECT ft.materia_prima_id, ft.cantidad, mp.nombre as materia_nombre, mp.stock_actual
       FROM fichas_tecnicas ft
       INNER JOIN materia_prima mp ON ft.materia_prima_id = mp.id
       WHERE ft.producto_id = ?`,
      [ficha.producto_id]
    );

    const alertasStock = [];
    for (const material of materiales) {
      const cantidadNecesaria = parseFloat(material.cantidad) * parseFloat(item.cantidad);
      if (parseFloat(material.stock_actual) < cantidadNecesaria) {
        alertasStock.push({
          materia: material.materia_nombre,
          stock_actual: material.stock_actual,
          cantidad_necesaria: cantidadNecesaria,
          faltante: cantidadNecesaria - parseFloat(material.stock_actual)
        });
      }
    }

    if (alertasStock.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuficiente para procesar este item',
        alertas_stock: alertasStock
      });
    }

    // Una OP por OC: buscar o crear
    let orden = await OrdenProduccionModel.getBySiigoOcId(item.siigo_oc_id);
    let ordenId;

    if (orden) {
      ordenId = orden.id;
    } else {
      ordenId = await OrdenProduccionModel.create({
        numero_orden: `OP-${item.numero_oc}`,
        producto_id: ficha.producto_id,
        cantidad_producir: 0,
        fecha_orden: item.fecha_oc || new Date(),
        estado: 'pendiente',
        observaciones: `Generada desde SIIGO OC: ${item.numero_oc}`,
        siigo_oc_id: item.siigo_oc_id
      });
    }

    const refPrenda = referencia_prenda || `${(ficha.producto_nombre || '').trim()} ${(item.talla || '').trim()}`.trim() || 'Item OC';

    await OpItemModel.create({
      orden_produccion_id: ordenId,
      producto_id: ficha.producto_id,
      referencia_prenda: refPrenda,
      codigo_item: item.item_numero ? String(item.item_numero) : null,
      talla: item.talla || null,
      diseno: item.diseno || null,
      cantidad: item.cantidad,
      precio_unitario: item.valor_unitario || null,
      total: item.valor_total || null
    });

    const [sumResult] = await db.execute(
      `SELECT COALESCE(SUM(cantidad), 0) as total FROM op_items WHERE orden_produccion_id = ?`,
      [ordenId]
    );
    const totalCantidad = sumResult[0]?.total || 0;
    await OrdenProduccionModel.update(ordenId, { cantidad_producir: totalCantidad });

    await SiigoOcModel.asignarOrdenProduccion(itemId, ordenId);

    res.json({
      success: true,
      data: {
        orden_produccion_id: ordenId,
        numero_orden: `OP-${item.numero_oc}`,
        alertas_stock: []
      },
      message: 'Item agregado a la orden de producción. Ve a Órdenes de Producción y usa "Procesar Orden Completa" para descontar materiales y generar el PDF costeado.'
    });
  } catch (error) {
    console.error('Error procesando item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Buscar fichas técnicas para un nombre de producto
exports.buscarFichasTecnicas = async (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro "nombre" es requerido'
      });
    }

    const fichas = await FichaTecnicaMatcher.buscarFichasTecnicas(nombre, 10);

    res.json({ success: true, data: fichas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar una OC (solo si no hay descuentos / items procesados)
exports.deleteOc = async (req, res) => { 
  try {
    const { id } = req.params;

    const oc = await SiigoOcModel.getById(id);
    if (!oc) {
      return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
    }

    const validacion = await SiigoOcModel.puedeEliminar(id);
    if (!validacion.puede_eliminar) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar: esta OC ya tiene items procesados (ya se hicieron descuentos / se creó OP).',
        data: validacion
      });
    }

    // Borrar archivo PDF si existe
    if (oc.pdf_path && fs.existsSync(oc.pdf_path)) {
      try {
        fs.unlinkSync(oc.pdf_path);
      } catch (e) {
        // No bloquear la eliminación si falla el borrado del archivo
        console.warn('No se pudo borrar el PDF:', e.message);
      }
    }

    const deleted = await SiigoOcModel.deleteById(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
    }

    res.json({ success: true, message: 'Orden de compra eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
