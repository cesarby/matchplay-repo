package com.matchplay.event.entity;

import com.matchplay.game.entity.Game;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "event_expansions")
@Getter
@Setter
@NoArgsConstructor
public class EventExpansion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expansion_game_id", nullable = false)
    private Game expansionGame;
}
