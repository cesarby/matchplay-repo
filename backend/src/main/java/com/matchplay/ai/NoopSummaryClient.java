package com.matchplay.ai;

import lombok.extern.slf4j.Slf4j;

/**
 * Implementación por defecto cuando no hay API key configurada. No genera
 * resúmenes; el sistema sigue funcionando sin ellos.
 */
@Slf4j
public class NoopSummaryClient implements AiSummaryClient {
    @Override
    public GameSummary summarize(String text) {
        log.debug("AI summary skipped (Noop client active)");
        return GameSummary.empty();
    }
}
