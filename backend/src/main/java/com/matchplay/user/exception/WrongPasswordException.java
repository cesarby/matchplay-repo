package com.matchplay.user.exception;

import com.matchplay.exception.MatchplayException;

/**
 * Lanzada cuando el usuario intenta cambiar su contraseña y la
 * contraseña actual aportada no coincide con la persistida.
 */
public class WrongPasswordException extends MatchplayException {
    public WrongPasswordException() {
        super("error.profile.password.wrong");
    }
}
