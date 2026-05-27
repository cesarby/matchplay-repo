package com.matchplay.session.entity;

import com.matchplay.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Mensaje del chat de coordinación de una partida.
 *
 * <p>Se borra en cascada cuando la {@link GameSession} pasa a COMPLETED o
 * CANCELLED (ver {@code GameSessionServiceImpl.changeStatus} y
 * {@code close}). No editable ni borrable individualmente por el usuario.</p>
 */
@Entity
@Table(
        name = "session_messages",
        indexes = {
                @Index(name = "idx_session_messages_session_created",
                        columnList = "session_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class SessionMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    public SessionMessage(GameSession session, User user, String content) {
        this.session = session;
        this.user = user;
        this.content = content;
    }
}
