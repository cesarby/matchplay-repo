-- V9: añade `creator_guests` a `game_sessions`.
--
-- Permite que el creador declare cuántas personas adicionales vienen con
-- él (acompañantes que no son usuarios del sistema). Esos huecos quedan
-- reservados de la capacidad total: si max=4 y creator_guests=2, la
-- partida arranca con registered_players=3 (creador + 2 acompañantes) y
-- solo queda 1 plaza para que otro usuario se apunte.
--
-- Reglas:
--  - DEFAULT 0  (atrás-compatible con filas existentes).
--  - 1 + creator_guests <= max_players  (validado en service, no en DB).

ALTER TABLE game_sessions
    ADD COLUMN creator_guests INT NOT NULL DEFAULT 0;
