-- V3: tabla refresh_tokens
-- Soporta el módulo Auth (cookies httpOnly de refresh).
-- Esta tabla debería haber estado en el baseline pre-Flyway pero faltaba en el
-- schema local de desarrollo. Como Flyway ya ha sido baselineado en V1, la
-- añadimos como migración explícita en lugar de meterla en el baseline.

CREATE TABLE refresh_tokens (
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    user_id              BIGINT       NOT NULL,
    token_hash           VARCHAR(64)  NOT NULL,
    expires_at           DATETIME(6)  NOT NULL,
    revoked              BIT(1)       NOT NULL DEFAULT b'0',
    revoked_at           DATETIME(6)  NULL,
    replaced_by_token_id BIGINT       NULL,
    created_at           DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    user_agent           VARCHAR(500) NULL,
    ip_address           VARCHAR(45)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE INDEX ix_refresh_tokens_token_hash (token_hash),
    INDEX ix_refresh_tokens_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
