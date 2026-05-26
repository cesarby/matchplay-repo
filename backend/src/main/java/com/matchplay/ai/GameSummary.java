package com.matchplay.ai;

/**
 * Resumen del juego en los idiomas soportados. Cualquier campo puede ser null
 * si el LLM falló o no había key configurada.
 */
public record GameSummary(String es, String en) {
    public static GameSummary empty() {
        return new GameSummary(null, null);
    }
}
