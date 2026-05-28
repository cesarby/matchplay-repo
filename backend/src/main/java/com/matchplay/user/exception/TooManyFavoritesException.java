package com.matchplay.user.exception;

import com.matchplay.exception.MatchplayException;

/**
 * Lanzada cuando el request de actualización envía más de 5 juegos favoritos.
 */
public class TooManyFavoritesException extends MatchplayException {
    public TooManyFavoritesException() {
        super("error.profile.too.many.favorites");
    }
}
