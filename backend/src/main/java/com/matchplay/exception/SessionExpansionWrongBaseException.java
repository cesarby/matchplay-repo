package com.matchplay.exception;

/**
 * Se lanzó cuando una expansión enviada en una request de partida
 * no pertenece al juego base de esa partida.
 */
public class SessionExpansionWrongBaseException extends MatchplayException {

    public SessionExpansionWrongBaseException(Long expansionBggId, Long expectedBaseBggId) {
        super("error.session.expansion.wrong.base", expansionBggId, expectedBaseBggId);
    }
}
