-- V6: eliminar la columna `name` de `users`.
-- Decisión de producto: en el registro solo pedimos email + username + password + geo.
-- El nombre real era fricción innecesaria para un MVP y el `username` cubre la
-- identidad de display. Si en el futuro se quiere "Display name" se vuelve
-- a añadir como nullable en perfil (sin tocar el registro).

ALTER TABLE users DROP COLUMN name;
