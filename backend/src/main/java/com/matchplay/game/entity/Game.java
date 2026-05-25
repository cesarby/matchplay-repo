package com.matchplay.game.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
}
