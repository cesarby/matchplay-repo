package com.matchplay.geo.exception;

import com.matchplay.exception.MatchplayException;

public class GeoCodeNotFoundException extends MatchplayException {

    public GeoCodeNotFoundException(String messageKey, String code) {
        super(messageKey, code);
    }
}
