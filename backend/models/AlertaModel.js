const db = require('../database/db');

class AlertaModel {
  // Obtener todas las alertas no leídas
  static async getNoLeidas() {
    const query = `
      SELECT 
        a.*,
        mp.codigo as materia_referencia,
        mp.nombre as materia_nombre,
        mp.stock_actual,
        mp.stock_minimo
      FROM alertas a
      INNER JOIN materia_prima mp ON a.materia_prima_id = mp.id
      WHERE a.leida = 0
      ORDER BY a.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Obtener todas las alertas
  static async getAll() {
    const query = `
      SELECT 
        a.*,
        mp.codigo as materia_referencia,
        mp.nombre as materia_nombre,
        mp.stock_actual,
        mp.stock_minimo
      FROM alertas a
      INNER JOIN materia_prima mp ON a.materia_prima_id = mp.id
      ORDER BY a.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Crear alerta
  static async create(data) {
    const query = `
      INSERT INTO alertas (materia_prima_id, tipo_alerta, mensaje)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.materia_prima_id,
      data.tipo_alerta,
      data.mensaje
    ]);
    return result.insertId;
  }

  // Marcar alerta como leída
  static async marcarLeida(id) {
    const query = `UPDATE alertas SET leida = 1 WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Marcar todas como leídas
  static async marcarTodasLeidas() {
    const query = `UPDATE alertas SET leida = 1 WHERE leida = 0`;
    const [result] = await db.execute(query);
    return result.affectedRows;
  }

  // Eliminar alerta
  static async delete(id) {
    const query = `DELETE FROM alertas WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  // Verificar y crear alertas automáticas
  static async verificarAlertas() {
    const query = `
      SELECT * FROM materia_prima 
      WHERE activo = 1 AND stock_actual <= stock_minimo
    `;
    const [materias] = await db.execute(query);

    const alertasCreadas = [];

    for (const materia of materias) {
      let tipoAlerta = 'stock_minimo';
      let mensaje = '';

      if (materia.stock_actual <= 0) {
        tipoAlerta = 'sin_stock';
        mensaje = `${materia.nombre} se ha agotado completamente. Stock actual: ${materia.stock_actual}`;
      } else if (materia.stock_actual <= (materia.stock_minimo * 0.5)) {
        tipoAlerta = 'stock_critico';
        mensaje = `${materia.nombre} tiene stock crítico. Stock actual: ${materia.stock_actual}, Mínimo: ${materia.stock_minimo}`;
      } else {
        mensaje = `${materia.nombre} ha alcanzado el stock mínimo. Stock actual: ${materia.stock_actual}, Mínimo: ${materia.stock_minimo}`;
      }

      // Verificar si ya existe una alerta no leída para esta materia prima
      const [existentes] = await db.execute(
        `SELECT id FROM alertas 
         WHERE materia_prima_id = ? AND leida = 0 AND tipo_alerta = ?`,
        [materia.id, tipoAlerta]
      );

      if (existentes.length === 0) {
        const alertaId = await this.create({
          materia_prima_id: materia.id,
          tipo_alerta: tipoAlerta,
          mensaje: mensaje
        });
        alertasCreadas.push(alertaId);
      }
    }

    return alertasCreadas;
  }
}

module.exports = AlertaModel;

