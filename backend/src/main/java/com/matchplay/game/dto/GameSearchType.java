package com.matchplay.game.dto;

public enum GameSearchType {

    BASE("boardgame"),
    EXPANSION("boardgameexpansion");

    private final String bggType;

    GameSearchType(String bggType) {
        this.bggType = bggType;
    }

    public String getBggType() {
        return bggType;
    }
}
