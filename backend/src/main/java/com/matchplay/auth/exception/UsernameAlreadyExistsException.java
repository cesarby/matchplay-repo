package com.matchplay.auth.exception;

import com.matchplay.exception.MatchplayException;

public class UsernameAlreadyExistsException extends MatchplayException {

    public UsernameAlreadyExistsException() {
        super("error.auth.username.duplicate");
    }
}
