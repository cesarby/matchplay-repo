-- V2: tabla game_sessions
-- Soporta el módulo Partidas (futuras controllers/services) y desbloquea
-- el endpoint público GET /api/v1/stats/public.
--
-- Diseño:
-- - id BIGINT identity (consistente con el resto del schema).
-- - status como VARCHAR (mapea a SessionStatus enum vía @Enumerated(STRING)).
-- - registered_players cacheado para evitar COUNT en cada lectura.
-- - índices pensados para los queries más frecuentes:
--     · listado público: WHERE status='OPEN' AND scheduled_at >= NOW()
--     · listado por ciudad: WHERE city_code = ?
--     · mis partidas creadas: WHERE creator_id = ?

CREATE TABLE game_sessions (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    title              VARCHAR(150) NOT NULL,
    description        TEXT         NULL,
    creator_id         BIGINT       NOT NULL,
    base_game_id       BIGINT       NOT NULL,
    city_code          VARCHAR(8)   NOT NULL,
    area_code          VARCHAR(16)  NULL,
    scheduled_at       DATETIME     NOT NULL,
    max_players        INT          NOT NULL,
    registered_players INT          NOT NULL DEFAULT 0,
    status             VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_session_creator   FOREIGN KEY (creator_id)   REFERENCES users(id),
    CONSTRAINT fk_session_base_game FOREIGN KEY (base_game_id) REFERENCES games(bgg_id),
    CONSTRAINT fk_session_city      FOREIGN KEY (city_code)    REFERENCES cities(code),
    CONSTRAINT fk_session_area      FOREIGN KEY (area_code)    REFERENCES areas(code),
    INDEX idx_session_status_scheduled (status, scheduled_at),
    INDEX idx_session_city             (city_code),
    INDEX idx_session_creator          (creator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
