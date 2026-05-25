-- V5: extender session_participants para soportar lista de espera.
-- Añadimos dos columnas:
--   - position: orden dentro de la waitlist (NULL para PLAYER).
--                Garantiza la regla "el primero que entró sale primero".
--   - promoted_at: timestamp en el que un WAITLIST pasó a PLAYER
--                (auditoría + base para notificación cuando exista).
--
-- No tocamos UNIQUE(session_id, user_id): un usuario sigue pudiendo
-- estar solo una vez por sesión, sea como PLAYER o WAITLIST.
-- El enum ParticipantRole se amplía en código (WAITLIST).

ALTER TABLE session_participants
    ADD COLUMN position    INT       NULL,
    ADD COLUMN promoted_at DATETIME  NULL;

-- Índice para la query "primero en la cola" (ordered scan).
CREATE INDEX idx_session_participants_role_position
    ON session_participants (session_id, role, position);
