package com.matchplay.game.exception;

import com.matchplay.exception.MatchplayException;

/**
 * Lanzada por el endpoint público de lectura de juegos cuando el {@code bggId}
 * no está en el caché local. No reintenta fetch a BGG (eso solo ocurre en
 * flujos de creación de partida, no en lecturas públicas).
 */
public class GameNotFoundException extends MatchplayException {
    public GameNotFoundException(Long bggId) {
        super("error.games.not.found", bggId);
    }
}
