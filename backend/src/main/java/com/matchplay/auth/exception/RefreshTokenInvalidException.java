package com.matchplay.auth.exception;

import com.matchplay.exception.MatchplayException;

public class RefreshTokenInvalidException extends MatchplayException {

    public RefreshTokenInvalidException() {
        super("error.auth.refresh.invalid");
    }
}
