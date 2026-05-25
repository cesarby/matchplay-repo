package com.matchplay.session.entity;

import com.matchplay.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Participante de una partida (usuario que se ha apuntado).
 *
 * <p>El creador de la partida no entra aquí salvo que decida apuntarse
 * explícitamente como jugador adicional (out of scope v1). Para v1 el
 * creador es siempre "organizador" implícito.</p>
 */
@Entity
@Table(
        name = "session_participants",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_session_participants_session_user",
                        columnNames = {"session_id", "user_id"}
                )
        },
        indexes = {
                @Index(name = "idx_session_participants_session", columnList = "session_id"),
                @Index(name = "idx_session_participants_user",    columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class SessionParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false, nullable = false)
    private Instant joinedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ParticipantRole role = ParticipantRole.PLAYER;

    public SessionParticipant(GameSession session, User user) {
        this.session = session;
        this.user = user;
        this.role = ParticipantRole.PLAYER;
    }
}
