package com.matchplay.exception;

public class SessionMaxPlayersBelowGameMinException extends MatchplayException {

    public SessionMaxPlayersBelowGameMinException(int requestedMax, int gameMin) {
        super("error.session.max.players.below.game.min", requestedMax, gameMin);
    }
}
