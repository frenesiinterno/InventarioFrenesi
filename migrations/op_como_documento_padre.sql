-- OP como entidad padre: documento con items y consumo MP trazable
-- Una Orden de Producción = 1 documento; items = hijos; consumo MP por item = trazabilidad PEPS
-- Ejecutar columnas una por una; si la columna ya existe, omitir ese ALTER.

-- 1) Campos en ordenes_produccion (ejecutar con run_migration_op_padre.js para evitar error si ya existen)
ALTER TABLE ordenes_produccion
  ADD COLUMN origen_pdf VARCHAR(500) NULL COMMENT 'Ruta/nombre del PDF origen si se cargó desde PDF' AFTER observaciones;
ALTER TABLE ordenes_produccion
  ADD COLUMN total_costo_mp DECIMAL(14, 4) NULL COMMENT 'Total costo MP al procesar' AFTER cantidad_producir;
ALTER TABLE ordenes_produccion
  ADD COLUMN pdf_ruta VARCHAR(500) NULL COMMENT 'PDF costeado OP-NUM-COSTEADA.pdf' AFTER origen_pdf;

-- 2) Tabla consumo MP por item (trazabilidad PEPS por item)
CREATE TABLE IF NOT EXISTS orden_produccion_consumo_mp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_produccion_item_id INT NOT NULL,
  materia_prima_id INT NOT NULL,
  cantidad_consumida DECIMAL(14, 4) NOT NULL,
  costo_unitario_peps DECIMAL(14, 4) NOT NULL DEFAULT 0,
  costo_total DECIMAL(14, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consumo_op_item (orden_produccion_item_id),
  INDEX idx_consumo_materia (materia_prima_id),
  FOREIGN KEY (orden_produccion_item_id) REFERENCES op_items(id) ON DELETE CASCADE,
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
