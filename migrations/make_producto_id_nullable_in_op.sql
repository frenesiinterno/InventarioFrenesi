-- Hacer producto_id nullable en ordenes_produccion para permitir órdenes con múltiples items
-- También asegurar que la tabla op_items existe

-- Primero crear op_items si no existe
CREATE TABLE IF NOT EXISTS `op_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orden_produccion_id` INT NOT NULL,
  `producto_id` INT NULL,
  `referencia_prenda` VARCHAR(255) NOT NULL,
  `codigo_item` VARCHAR(50) NULL,
  `talla` VARCHAR(20) NULL,
  `diseno` VARCHAR(100) NULL,
  `precio_unitario` DECIMAL(10, 2) NULL,
  `cantidad` INT NOT NULL,
  `descuento` DECIMAL(5, 2) DEFAULT 0.00,
  `total` DECIMAL(10, 2) NULL,
  `producto_match_type` ENUM('exacto', 'similar', 'nuevo', 'no_encontrado') DEFAULT 'no_encontrado',
  `producto_sugerido_id` INT NULL,
  `necesita_revision` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`orden_produccion_id`) REFERENCES `ordenes_produccion` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`producto_sugerido_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL,
  INDEX `idx_op_items_orden` (`orden_produccion_id`),
  INDEX `idx_op_items_producto` (`producto_id`),
  INDEX `idx_op_items_referencia` (`referencia_prenda`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Hacer producto_id nullable en ordenes_produccion
ALTER TABLE `ordenes_produccion` 
MODIFY COLUMN `producto_id` INT NULL;

-- Hacer cantidad_producir nullable o con valor por defecto 0
ALTER TABLE `ordenes_produccion`
MODIFY COLUMN `cantidad_producir` INT NOT NULL DEFAULT 0;

