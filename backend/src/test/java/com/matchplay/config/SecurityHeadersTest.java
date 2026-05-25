package com.matchplay.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHeadersTest {

    @Autowired MockMvc mockMvc;

    @Test
    void dumpsDefaultSecurityHeaders_publicEndpoint() throws Exception {
        printHeaders("GET /api/v1/games (público)", get("/api/v1/games").param("q", "catan"));
    }

    @Test
    void dumpsDefaultSecurityHeaders_protectedEndpoint() throws Exception {
        printHeaders("GET /api/v1/auth/me (sin token, 401)", get("/api/v1/auth/me"));
    }

    private void printHeaders(String label, MockHttpServletRequestBuilder req) throws Exception {
        MvcResult result = mockMvc.perform(req).andReturn();
        Map<String, List<String>> headers = new TreeMap<>();
        for (String name : result.getResponse().getHeaderNames()) {
            headers.put(name, result.getResponse().getHeaders(name));
        }
        String rendered = headers.entrySet().stream()
                .map(e -> "  " + e.getKey() + ": " + String.join(", ", e.getValue()))
                .collect(Collectors.joining("\n"));
        System.out.println("\n===== " + label + " (status=" + result.getResponse().getStatus() + ") =====");
        System.out.println(rendered);
        System.out.println("===== end =====\n");
        assertThat(headers).isNotEmpty();
    }
}
