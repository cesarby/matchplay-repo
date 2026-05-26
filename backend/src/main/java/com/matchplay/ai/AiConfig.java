package com.matchplay.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Bean
    public AiSummaryClient aiSummaryClient(
            @Value("${anthropic.api-key:}") String apiKey
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            return new NoopSummaryClient();
        }
        return new ClaudeHaikuSummaryClient(apiKey);
    }
}
