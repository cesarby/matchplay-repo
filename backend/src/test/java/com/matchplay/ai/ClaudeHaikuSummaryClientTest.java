package com.matchplay.ai;

import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class ClaudeHaikuSummaryClientTest {

    private WireMockServer wm;
    private ClaudeHaikuSummaryClient client;

    @BeforeEach
    void setUp() {
        wm = new WireMockServer(0);
        wm.start();
        client = new ClaudeHaikuSummaryClient("test-key", "http://localhost:" + wm.port());
    }

    @AfterEach
    void tearDown() {
        wm.stop();
    }

    @Test
    void returnsBothLanguagesWhenApiSucceeds() {
        wm.stubFor(post(urlEqualTo("/v1/messages"))
                .willReturn(okJson("""
                    {"content":[{"type":"text","text":"Resumen ES de prueba."}]}
                    """)));

        GameSummary out = client.summarize("Texto largo de BGG...");

        assertThat(out.es()).contains("Resumen ES");
        assertThat(out.en()).contains("Resumen ES"); // mismo stub responde a ambas calls
    }

    @Test
    void returnsEmptyOnServerError() {
        wm.stubFor(post(urlEqualTo("/v1/messages"))
                .willReturn(serverError()));

        GameSummary out = client.summarize("Texto largo de BGG...");

        assertThat(out.es()).isNull();
        assertThat(out.en()).isNull();
    }

    @Test
    void returnsEmptyOnBlankInput() {
        GameSummary out = client.summarize("   ");
        assertThat(out).isEqualTo(GameSummary.empty());
        wm.verify(0, postRequestedFor(urlEqualTo("/v1/messages")));
    }
}
