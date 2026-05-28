package com.matchplay.user.exception;

import com.matchplay.exception.MatchplayException;

/**
 * Lanzada cuando el avatarCode del request no existe en la tabla {@code avatars}
 * (defensa en profundidad — el @Pattern del DTO ya filtra formato).
 */
public class InvalidAvatarCodeException extends MatchplayException {
    public InvalidAvatarCodeException(String code) {
        super("error.profile.invalid.avatar.code", code);
    }
}
