-- Tabla para almacenar los items/prendas de cada orden de producción
-- Permite que una orden tenga múltiples prendas diferentes

CREATE TABLE IF NOT EXISTS `op_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orden_produccion_id` INT NOT NULL,
  `producto_id` INT NULL, -- NULL si el producto no se encontró y se necesita crear
  `referencia_prenda` VARCHAR(255) NOT NULL, -- La referencia extraída del PDF (ej: "ENTERIZO MANGA CORTA KRONO")
  `codigo_item` VARCHAR(50) NULL, -- El código extraído del PDF (ej: "5393.1")
  `talla` VARCHAR(20) NULL, -- Talla extraída (ej: "S", "M", "L")
  `diseno` VARCHAR(100) NULL, -- Diseño extraído (ej: "CAUTION PETROLEO")
  `precio_unitario` DECIMAL(10, 2) NULL, -- Precio de la prenda según el PDF
  `cantidad` INT NOT NULL, -- Cantidad a producir de esta prenda
  `descuento` DECIMAL(5, 2) DEFAULT 0.00, -- Porcentaje de descuento
  `total` DECIMAL(10, 2) NULL, -- Total calculado
  `producto_match_type` ENUM('exacto', 'similar', 'nuevo', 'no_encontrado') DEFAULT 'no_encontrado', -- Tipo de coincidencia
  `producto_sugerido_id` INT NULL, -- ID del producto sugerido si hubo match
  `necesita_revision` BOOLEAN DEFAULT FALSE, -- Si necesita revisión manual
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`orden_produccion_id`) REFERENCES `ordenes_produccion` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`producto_sugerido_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL,
  INDEX `idx_op_items_orden` (`orden_produccion_id`),
  INDEX `idx_op_items_producto` (`producto_id`),
  INDEX `idx_op_items_referencia` (`referencia_prenda`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

