package com.matchplay.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Cliente HTTP de la API de Anthropic Messages para generar resúmenes con
 * Claude Haiku 4.5. Hace una llamada por idioma (ES y EN). Tolerante a fallos:
 * cualquier error de red, HTTP o parseo se traduce a {@link GameSummary#empty()}.
 */
@Slf4j
public class ClaudeHaikuSummaryClient implements AiSummaryClient {

    private static final String MODEL = "claude-haiku-4-5-20251001";
    private static final int MAX_TOKENS = 400;
    private static final String DEFAULT_BASE_URL = "https://api.anthropic.com";

    private final RestClient http;
    private final ObjectMapper mapper = new ObjectMapper();

    public ClaudeHaikuSummaryClient(String apiKey) {
        this(apiKey, DEFAULT_BASE_URL, 3000, 10000);
    }

    public ClaudeHaikuSummaryClient(String apiKey, int connectTimeoutMs, int readTimeoutMs) {
        this(apiKey, DEFAULT_BASE_URL, connectTimeoutMs, readTimeoutMs);
    }

    /** Constructor para tests (permite redirigir a WireMock). */
    public ClaudeHaikuSummaryClient(String apiKey, String baseUrl, int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader("content-type", "application/json")
                .build();
    }

    @Override
    public GameSummary summarize(String text) {
        if (text == null || text.isBlank()) {
            return GameSummary.empty();
        }
        String es = callOnce(text, "español");
        String en = callOnce(text, "English");
        return new GameSummary(es, en);
    }

    private String callOnce(String text, String language) {
        String prompt = """
                Eres un experto en juegos de mesa. Resume el siguiente texto en %s en un
                párrafo de ~500 caracteres con tono editorial. Menciona qué haces, la mecánica
                principal y a qué tipo de jugador le gusta. Sin saludos, sin meta-comentarios,
                sin Markdown.

                Texto:
                %s
                """.formatted(language, text);

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", MAX_TOKENS,
                "temperature", 0.4,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        try {
            String raw = http.post()
                    .uri("/v1/messages")
                    .body(body)
                    .retrieve()
                    .body(String.class);
            if (raw == null) return null;
            JsonNode root = mapper.readTree(raw);
            JsonNode content = root.path("content");
            if (content.isArray() && content.size() > 0) {
                String txt = content.get(0).path("text").asText(null);
                if (txt != null && !txt.isBlank()) return txt.trim();
            }
            log.warn("Anthropic response had no usable content (len={}): {}",
                    raw.length(),
                    raw.length() > 200 ? raw.substring(0, 200) + "…" : raw);
            return null;
        } catch (Exception e) {
            log.warn("Anthropic call failed ({})", language, e);
            return null;
        }
    }
}
