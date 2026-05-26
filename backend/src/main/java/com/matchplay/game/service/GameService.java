package com.matchplay.game.service;

import com.matchplay.game.entity.Game;

/**
 * Operaciones del catálogo local de juegos (cache de BGG).
 *
 * <p>Distinto de {@link GameSearchService}: este servicio se encarga del
 * estado persistido. Los consumidores típicos son módulos que necesitan
 * referenciar un juego por {@code bggId} en su propio dominio (e.g.
 * {@code GameSessionService} al crear/editar una partida).</p>
 */
public interface GameService {

    /**
     * Devuelve un {@link Game} del caché local; si no existe, lo trae de
     * BoardGameGeek y lo persiste con sus flags ({@code isExpansion},
     * {@code baseGameBggId}) ya rellenos.
     *
     * <p>La relación base ↔ expansión queda codificada en
     * {@code games.base_game_bgg_id}: no hay tabla join separada.</p>
     *
     * @throws com.matchplay.game.exception.BaseGameNotFoundException si BGG
     *         no conoce ese {@code bggId}.
     */
    Game findOrFetch(Long bggId);
}
