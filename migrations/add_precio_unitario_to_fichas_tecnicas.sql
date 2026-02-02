-- Agregar columna precio_unitario a la tabla fichas_tecnicas
ALTER TABLE fichas_tecnicas 
ADD COLUMN precio_unitario DECIMAL(10,2) NULL AFTER cantidad;

-- Poblar con los precios actuales de materia_prima
UPDATE fichas_tecnicas ft
INNER JOIN materia_prima mp ON ft.materia_prima_id = mp.id
SET ft.precio_unitario = mp.precio_unitario;

-- Hacer la columna NOT NULL después de poblarla
ALTER TABLE fichas_tecnicas 
MODIFY COLUMN precio_unitario DECIMAL(10,2) NOT NULL;
