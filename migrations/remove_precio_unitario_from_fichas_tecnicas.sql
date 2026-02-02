-- Eliminar precio_unitario de fichas_tecnicas
-- Las fichas técnicas solo deben definir consumo, no costos

ALTER TABLE fichas_tecnicas 
DROP COLUMN IF EXISTS precio_unitario;

