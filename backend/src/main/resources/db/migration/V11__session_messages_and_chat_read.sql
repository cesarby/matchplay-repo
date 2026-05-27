CREATE TABLE session_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_msg_session FOREIGN KEY (session_id)
        REFERENCES game_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_msg_user FOREIGN KEY (user_id)
        REFERENCES users(id),
    INDEX idx_session_messages_session_created (session_id, created_at)
);

ALTER TABLE session_participants
    ADD COLUMN last_chat_read_at TIMESTAMP NULL;
