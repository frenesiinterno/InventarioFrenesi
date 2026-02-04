const db = require('../database/db');

(async () => {
  try {
    const limit = 500;
    const query = `
      SELECT 
        k.*,
        mp.codigo as materia_codigo,
        mp.nombre as materia_nombre,
        um.codigo as unidad_codigo,
        um.nombre as unidad_nombre,
        op.codigo_siigo as numero_orden,
        c.numero_factura,
        c.proveedor_nombre as compra_proveedor_nombre,
        p.nombre as proveedor_nombre_registrado
      FROM kardex k
      INNER JOIN lotes_materia_prima lmp ON k.lote_id = lmp.id
      INNER JOIN materias_primas mp ON lmp.materia_prima_id = mp.id
      INNER JOIN unidades_medida um ON mp.unidad_medida_id = um.id
      LEFT JOIN ordenes_produccion op ON LOWER(k.referencia_tipo) = 'orden' AND k.referencia_id = op.id
      LEFT JOIN compras c ON LOWER(k.referencia_tipo) = 'compra' AND k.referencia_id = c.id
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      ORDER BY k.fecha DESC, k.id DESC
      LIMIT ${parseInt(limit)}
    `;

    const [rows] = await db.execute(query);
    console.log('rows count:', rows.length);

    // Describir tablas relevantes
    const [descMp] = await db.execute('DESCRIBE materias_primas');
    console.log('materias_primas columns:', descMp.map(r=>r.Field));
    const [descUm] = await db.execute('DESCRIBE unidades_medida');
    console.log('unidades_medida columns:', descUm.map(r=>r.Field));
  } catch (err) {
    console.error('QUERY ERR:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
  }
  process.exit(0);
})();