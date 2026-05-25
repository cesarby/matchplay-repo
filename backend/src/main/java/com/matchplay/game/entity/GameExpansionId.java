package com.matchplay.game.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class GameExpansionId implements Serializable {

    @Column(name = "base_game_id")
    private Long baseGameId;

    @Column(name = "expansion_game_id")
    private Long expansionGameId;
}
