-- Agregar campos para almacenar información del PDF con costos calculados
-- y metadatos del procesamiento

ALTER TABLE `op_items` 
ADD COLUMN `costo_materia_prima` DECIMAL(12, 4) DEFAULT 0 COMMENT 'Costo total de materia prima para este item' AFTER `precio_unitario`,
ADD COLUMN `precio_calculado` DECIMAL(12, 4) DEFAULT 0 COMMENT 'Precio unitario calculado basado en costo de materia prima' AFTER `costo_materia_prima`,
ADD COLUMN `total_calculado` DECIMAL(12, 4) DEFAULT 0 COMMENT 'Total calculado: precio_calculado * cantidad' AFTER `precio_calculado`,
ADD COLUMN `detalles_costos` JSON COMMENT 'Detalles JSON del desglose de costos de materiales' AFTER `total_calculado`,
ADD COLUMN `pdf_ruta` VARCHAR(500) COMMENT 'Ruta del PDF generado con costos calculados' AFTER `detalles_costos`,
ADD COLUMN `procesado` BOOLEAN DEFAULT FALSE COMMENT 'Si el item ha sido procesado (materiales descontados)' AFTER `pdf_ruta`,
ADD COLUMN `fecha_procesamiento` TIMESTAMP NULL COMMENT 'Fecha en que se procesó el item' AFTER `procesado`;

-- Crear índice para búsquedas rápidas de items procesados
CREATE INDEX `idx_op_items_procesado` ON `op_items` (`procesado`);
CREATE INDEX `idx_op_items_fecha_procesamiento` ON `op_items` (`fecha_procesamiento`);
