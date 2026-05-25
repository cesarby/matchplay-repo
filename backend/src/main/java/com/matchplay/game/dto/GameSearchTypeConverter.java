package com.matchplay.game.dto;

import com.matchplay.game.exception.InvalidGameSearchException;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class GameSearchTypeConverter implements Converter<String, GameSearchType> {

    @Override
    public GameSearchType convert(String source) {
        if (source == null || source.isBlank()) {
            return GameSearchType.BASE;
        }
        try {
            return GameSearchType.valueOf(source.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidGameSearchException("error.games.type.invalid", source);
        }
    }
}
