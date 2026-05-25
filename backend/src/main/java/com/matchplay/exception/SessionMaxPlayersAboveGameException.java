package com.matchplay.exception;

public class SessionMaxPlayersAboveGameException extends MatchplayException {

    public SessionMaxPlayersAboveGameException(int requestedMax, int gameMax) {
        super("error.session.max.players.above.game", requestedMax, gameMax);
    }
}
