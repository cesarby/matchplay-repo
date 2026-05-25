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
 * Participante de una partida.
 *
 * <p>Puede estar en plaza confirmada ({@code role = PLAYER}) o en cola
 * ({@code role = WAITLIST}). {@code position} solo se rellena para WAITLIST
 * y define el orden de promoción (FIFO). {@code promotedAt} guarda el
 * momento en que un WAITLIST pasó a PLAYER — útil para auditar y como base
 * de futuras notificaciones.</p>
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
                @Index(name = "idx_session_participants_user",    columnList = "user_id"),
                @Index(name = "idx_session_participants_role_position",
                        columnList = "session_id, role, position")
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

    /** Solo se usa cuando role == WAITLIST. Orden FIFO en la cola. */
    @Column
    private Integer position;

    /** Timestamp en el que un WAITLIST se promocionó a PLAYER. Null si nunca. */
    @Column(name = "promoted_at")
    private Instant promotedAt;

    public SessionParticipant(GameSession session, User user) {
        this.session = session;
        this.user = user;
        this.role = ParticipantRole.PLAYER;
    }

    /** Constructor para alta directa como WAITLIST. */
    public SessionParticipant(GameSession session, User user, int waitlistPosition) {
        this.session = session;
        this.user = user;
        this.role = ParticipantRole.WAITLIST;
        this.position = waitlistPosition;
    }
}
