package com.matchplay.auth.exception;

import com.matchplay.exception.MatchplayException;

public class RateLimitedException extends MatchplayException {

    public RateLimitedException() {
        super("error.auth.rate.limited");
    }
}
