package com.matchplay.game.exception;

import com.matchplay.exception.MatchplayException;

public class BaseGameNotFoundException extends MatchplayException {

    private final Long bggId;

    public BaseGameNotFoundException(Long bggId) {
        super("error.games.base.not.found", bggId);
        this.bggId = bggId;
    }

    public Long getBggId() { return bggId; }
}
