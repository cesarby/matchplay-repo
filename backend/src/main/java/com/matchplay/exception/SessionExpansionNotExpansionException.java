package com.matchplay.exception;

/**
 * Se lanzó cuando el bggId enviado como "expansión" en una request de
 * partida resuelve a un juego BGG cuyo {@code isExpansion} es false.
 */
public class SessionExpansionNotExpansionException extends MatchplayException {

    public SessionExpansionNotExpansionException(Long bggId) {
        super("error.session.expansion.not.expansion", bggId);
    }
}
