package com.matchplay.game.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Caché local de un juego (o expansión) de BoardGameGeek.
 *
 * <p>Se persiste de forma perezosa: cuando un consumidor (típicamente
 * {@code GameSessionService} al crear/editar una partida) necesita el juego
 * y no está en local, se hace un fetch a BGG vía {@link
 * com.matchplay.game.service.GameService#findOrFetch(Long)} y se inserta.</p>
 *
 * <p>{@code isExpansion} y {@code baseGameBggId} permiten validar la
 * relación base ↔ expansión sin volver a BGG. {@code baseGameBggId} es
 * NULL en juegos base.</p>
 */
@Entity
@Table(name = "games")
@Getter
@Setter
@NoArgsConstructor
public class Game {

    @Id
    @Column(name = "bgg_id")
    private Long bggId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "year_published")
    private Integer yearPublished;

    @Column(name = "min_players")
    private Integer minPlayers;

    @Column(name = "max_players")
    private Integer maxPlayers;

    @Column(name = "playing_time")
    private Integer playingTime;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_expansion", nullable = false)
    private boolean isExpansion;

    /**
     * bggId del juego base si esta fila es una expansión. NULL si es base.
     * Sin FK formal en la DB para evitar problemas de orden de inserción
     * cuando se cachean lazy desde BGG.
     */
    @Column(name = "base_game_bgg_id")
    private Long baseGameBggId;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "summary_es", length = 700)
    private String summaryEs;

    @Column(name = "summary_en", length = 700)
    private String summaryEn;
}
