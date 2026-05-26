package com.matchplay.ai;

public interface AiSummaryClient {
    /**
     * Resume el texto dado en español e inglés.
     * Implementaciones deben ser tolerantes a fallos: nunca lanzar excepciones,
     * devolver {@link GameSummary#empty()} en su lugar.
     */
    GameSummary summarize(String text);
}
