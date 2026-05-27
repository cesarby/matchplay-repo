package com.matchplay.session.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.config.LocaleConfig;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.exception.SessionChatClosedException;
import com.matchplay.exception.SessionChatForbiddenException;
import com.matchplay.exception.SessionChatWriteForbiddenException;
import com.matchplay.session.dto.CreateMessageRequest;
import com.matchplay.session.dto.SessionMessageResponse;
import com.matchplay.session.service.SessionChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Import;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class SessionChatControllerTest {

    @Autowired MessageSource messageSource;

    @Mock SessionChatService chatService;

    MockMvc mockMvc;
    ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("es"));
        localeResolver.setSupportedLocales(List.of(new Locale("es"), Locale.ENGLISH));

        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter(objectMapper);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new SessionChatController(chatService))
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setMessageConverters(jsonConverter)
                .build();
    }

    @Test
    void list_returns200WithMessages() throws Exception {
        SessionMessageResponse m = new SessionMessageResponse(
                1L, 2L, "alice", "hola", Instant.parse("2026-01-01T10:00:00Z"));
        when(chatService.list(eq(10L), eq(null))).thenReturn(List.of(m));

        mockMvc.perform(get("/api/v1/sessions/10/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].content").value("hola"));
    }

    @Test
    void list_returns403_whenForbidden() throws Exception {
        when(chatService.list(eq(10L), any())).thenThrow(new SessionChatForbiddenException());

        mockMvc.perform(get("/api/v1/sessions/10/messages"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("error.session.chat.forbidden"));
    }

    @Test
    void send_returns200_withCreatedMessage() throws Exception {
        SessionMessageResponse m = new SessionMessageResponse(
                42L, 2L, "alice", "hola", Instant.parse("2026-01-01T10:00:00Z"));
        when(chatService.send(eq(10L), any())).thenReturn(m);

        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("hola"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.content").value("hola"));
    }

    @Test
    void send_returns400_whenContentBlank() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("   "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_returns403_whenWaitlist() throws Exception {
        when(chatService.send(eq(10L), any())).thenThrow(new SessionChatWriteForbiddenException());

        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("hola"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("error.session.chat.write.forbidden"));
    }

    @Test
    void send_returns409_whenChatClosed() throws Exception {
        when(chatService.send(eq(10L), any())).thenThrow(new SessionChatClosedException());

        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("hola"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("error.session.chat.closed"));
    }

    @Test
    void markRead_returns204() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/10/messages/mark-read"))
                .andExpect(status().isNoContent());
    }
}
