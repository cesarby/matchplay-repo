package com.matchplay.exception;

/**
 * Se lanza cuando el creador declara más acompañantes de los que caben
 * en la partida: {@code 1 + creatorGuests > maxPlayers}.
 */
public class SessionGuestsExceedMaxException extends MatchplayException {

    public SessionGuestsExceedMaxException(int guests, int maxPlayers) {
        super("error.session.guests.exceed.max", guests, maxPlayers);
    }
}
