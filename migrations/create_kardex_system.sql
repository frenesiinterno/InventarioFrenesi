-- Sistema de Kardex Completo
-- Este script crea las tablas necesarias para el sistema de Kardex con PEPS y Promedio Ponderado

-- Tabla principal de Kardex (movimientos con costos)
CREATE TABLE IF NOT EXISTS kardex_movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_prima_id INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo ENUM('ENTRADA', 'SALIDA', 'AJUSTE') NOT NULL,
  cantidad DECIMAL(14, 4) NOT NULL,
  costo_unitario DECIMAL(14, 4) NOT NULL DEFAULT 0,
  saldo_cantidad DECIMAL(14, 4) NOT NULL DEFAULT 0,
  saldo_costo DECIMAL(14, 4) NOT NULL DEFAULT 0,
  referencia ENUM('COMPRA', 'OP', 'MERMA', 'AJUSTE', 'OTRO') DEFAULT 'OTRO',
  referencia_id INT NULL,
  motivo VARCHAR(255) NULL,
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kardex_materia (materia_prima_id),
  INDEX idx_kardex_fecha (fecha),
  INDEX idx_kardex_referencia (referencia, referencia_id),
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabla de Capas PEPS (Primeras Entradas Primeras Salidas)
CREATE TABLE IF NOT EXISTS kardex_capas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_prima_id INT NOT NULL,
  kardex_movimiento_id INT NOT NULL,
  cantidad_restante DECIMAL(14, 4) NOT NULL,
  costo_unitario DECIMAL(14, 4) NOT NULL,
  fecha_entrada DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_capas_materia (materia_prima_id),
  INDEX idx_capas_movimiento (kardex_movimiento_id),
  INDEX idx_capas_fecha (fecha_entrada),
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT,
  FOREIGN KEY (kardex_movimiento_id) REFERENCES kardex_movimientos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

