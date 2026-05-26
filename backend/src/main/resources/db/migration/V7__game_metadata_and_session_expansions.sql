-- V7: añade metadata de expansión a `games` y crea la tabla M:N
--     `game_session_expansions` que asocia expansiones a partidas.
--
-- Diseño:
-- - `games.is_expansion`     marca si una fila representa una expansión BGG.
-- - `games.base_game_bgg_id` apunta al juego base (solo poblado en expansiones;
--   self-reference NULL en juegos base). Sin FK para evitar problemas de orden
--   al insertar en BGG-fetch lazy.
-- - `game_session_expansions` es la M:N entre `game_sessions` y `games`
--   restringida a filas con `is_expansion = TRUE` por lógica de aplicación.
-- - `position` preserva el orden en que el creador añadió las expansiones.
-- - ON DELETE CASCADE en session_id: si la partida se borra, sus expansiones
--   se limpian. No cascada en expansion_id: las filas de catálogo no se borran.

ALTER TABLE games
    ADD COLUMN is_expansion     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN base_game_bgg_id BIGINT  NULL;

CREATE INDEX idx_games_base_game_bgg_id ON games (base_game_bgg_id);

CREATE TABLE game_session_expansions (
    session_id   BIGINT NOT NULL,
    expansion_id BIGINT NOT NULL,
    position     INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, expansion_id),
    CONSTRAINT fk_gse_session   FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_gse_expansion FOREIGN KEY (expansion_id) REFERENCES games(bgg_id),
    INDEX idx_gse_session   (session_id),
    INDEX idx_gse_expansion (expansion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
