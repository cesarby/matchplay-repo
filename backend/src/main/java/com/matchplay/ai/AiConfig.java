package com.matchplay.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class AiConfig {

    @Bean
    public AiSummaryClient aiSummaryClient(
            @Value("${anthropic.api-key:}") String apiKey,
            @Value("${anthropic.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${anthropic.read-timeout-ms:10000}") int readTimeoutMs
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("AI summaries disabled — no ANTHROPIC_API_KEY configured");
            return new NoopSummaryClient();
        }
        log.info("AI summaries enabled with Claude Haiku (connect={}ms, read={}ms)",
                connectTimeoutMs, readTimeoutMs);
        return new ClaudeHaikuSummaryClient(apiKey, connectTimeoutMs, readTimeoutMs);
    }
}
