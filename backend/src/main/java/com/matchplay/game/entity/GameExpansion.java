package com.matchplay.game.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "game_expansions")
@Getter
@Setter
@NoArgsConstructor
public class GameExpansion {

    @EmbeddedId
    private GameExpansionId id;

    @MapsId("baseGameId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "base_game_id")
    private Game baseGame;

    @MapsId("expansionGameId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expansion_game_id")
    private Game expansionGame;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
