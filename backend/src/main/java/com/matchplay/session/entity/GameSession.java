package com.matchplay.session.entity;

import com.matchplay.game.entity.Game;
import com.matchplay.geo.entity.Area;
import com.matchplay.geo.entity.City;
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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Partida de juego de mesa.
 *
 * <p>Asocia un juego base ({@link #baseGame}) y opcionalmente varias
 * expansiones del mismo base ({@link #expansions}). Las expansiones se
 * persisten en la tabla M:N {@code game_session_expansions} con
 * {@code position} preservando el orden de inserción.</p>
 */
@Entity
@Table(
        name = "game_sessions",
        indexes = {
                @Index(name = "idx_session_status_scheduled", columnList = "status, scheduled_at"),
                @Index(name = "idx_session_city", columnList = "city_code"),
                @Index(name = "idx_session_creator", columnList = "creator_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "base_game_id", nullable = false, referencedColumnName = "bgg_id")
    private Game baseGame;

    /**
     * Expansiones asociadas a la partida. Orden preservado por la columna
     * {@code position} en la tabla join. Todas deben tener
     * {@code baseGameBggId == baseGame.bggId} (validado en service).
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "game_session_expansions",
            joinColumns = @JoinColumn(name = "session_id"),
            inverseJoinColumns = @JoinColumn(name = "expansion_id", referencedColumnName = "bgg_id")
    )
    @OrderColumn(name = "position")
    private List<Game> expansions = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "city_code", nullable = false, referencedColumnName = "code")
    private City city;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_code", referencedColumnName = "code")
    private Area area;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "max_players", nullable = false)
    private int maxPlayers;

    @Column(name = "registered_players", nullable = false)
    private int registeredPlayers;

    /**
     * Personas adicionales que el creador trae consigo y que no son usuarios
     * del sistema. Cuenta para la capacidad: si {@code maxPlayers = 4} y
     * {@code creatorGuests = 2}, solo cabe 1 usuario apuntado además del creador.
     */
    @Column(name = "creator_guests", nullable = false)
    private int creatorGuests;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionStatus status = SessionStatus.OPEN;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
