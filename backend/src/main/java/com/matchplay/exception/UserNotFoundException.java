package com.matchplay.exception;

public class UserNotFoundException extends ResourceNotFoundException {

    public UserNotFoundException(Long userId) {
        super("error.user.not.found", userId);
    }
}
