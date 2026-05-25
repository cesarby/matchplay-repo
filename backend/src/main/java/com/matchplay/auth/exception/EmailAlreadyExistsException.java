package com.matchplay.auth.exception;

import com.matchplay.exception.MatchplayException;

public class EmailAlreadyExistsException extends MatchplayException {

    public EmailAlreadyExistsException() {
        super("error.auth.email.duplicate");
    }
}
