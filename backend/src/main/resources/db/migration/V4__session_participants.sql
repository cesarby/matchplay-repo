-- V4: tabla session_participants
-- Modelo N:M entre game_sessions y users con metadata por participación.
-- Diseño:
--  - El creador de la sesión NO se inserta automáticamente aquí; cuenta como
--    "organizador" implícito vía game_sessions.creator_id. Sus posibles
--    apuntes adicionales como JUGADOR se gestionan en una iteración futura.
--  - UNIQUE(session_id, user_id) impide doble-join. La lógica de aplicación
--    también lo valida, pero la restricción de BD es el seguro real.
--  - joined_at NOT NULL con DEFAULT CURRENT_TIMESTAMP — un join siempre
--    deja huella temporal.
--  - role como VARCHAR pequeño para futura extensión (waitlist, etc.).
--    Por ahora solo aplicamos PLAYER.

CREATE TABLE session_participants (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    session_id BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    joined_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role       VARCHAR(16) NOT NULL DEFAULT 'PLAYER',
    PRIMARY KEY (id),
    CONSTRAINT fk_session_participant_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_participant_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    UNIQUE KEY uq_session_participants_session_user (session_id, user_id),
    INDEX idx_session_participants_session (session_id),
    INDEX idx_session_participants_user    (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
