package com.matchplay.auth.exception;

import com.matchplay.exception.MatchplayException;

public class InvalidCredentialsException extends MatchplayException {

    public InvalidCredentialsException() {
        super("error.auth.invalid.credentials");
    }
}
