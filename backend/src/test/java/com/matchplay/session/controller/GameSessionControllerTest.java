package com.matchplay.session.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.config.LocaleConfig;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.exception.SessionNotFoundException;
import com.matchplay.session.dto.CreateSessionRequest;
import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.service.GameSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class GameSessionControllerTest {

    @Autowired MessageSource messageSource;

    @Mock GameSessionService service;

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
                .standaloneSetup(new GameSessionController(service))
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setMessageConverters(jsonConverter)
                .build();
    }

    @Test
    void search_returns200WithPage() throws Exception {
        SessionSummaryResponse s = new SessionSummaryResponse(
                1L, "Catan", 13L, "Catan",
                "MAD01", "Madrid", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS), 4, 1,
                SessionStatus.OPEN, 1L, "creator");

        given(service.search(any(), any())).willReturn(
                new PageImpl<>(List.of(s), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].baseGameName").value("Catan"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void findById_whenMissing_returns404WithCode() throws Exception {
        willThrow(new SessionNotFoundException(99L)).given(service).findById(99L);

        mockMvc.perform(get("/api/v1/sessions/99").header("Accept-Language", "es"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("error.session.not.found"))
                .andExpect(jsonPath("$.message").value("La partida con id 99 no existe"));
    }

    @Test
    void create_withInvalidPayload_returns400() throws Exception {
        // title vacío + scheduledAt null
        String body = """
                {"title":"","baseGameId":13,"cityCode":"MAD01","scheduledAt":null,"maxPlayers":4}
                """;

        mockMvc.perform(post("/api/v1/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("error.validation"));
    }

    @Test
    void create_withValidPayload_returns201WithLocation() throws Exception {
        Instant future = Instant.parse("2030-01-01T20:00:00Z");
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, "MAD01", null, future, 4);
        SessionDetailResponse created = new SessionDetailResponse(
                42L, "Catan Night", "Desc", 13L, "Catan",
                "MAD01", "Madrid", null, null,
                future, 4, 0, SessionStatus.OPEN,
                1L, "creator", List.of(), Instant.now(), Instant.now());

        given(service.create(any())).willReturn(created);

        mockMvc.perform(post("/api/v1/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42));
    }

    @Test
    void join_returns200WithDetail() throws Exception {
        SessionDetailResponse d = new SessionDetailResponse(
                10L, "Catan", null, 13L, "Catan",
                "MAD01", "Madrid", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS), 4, 2,
                SessionStatus.OPEN, 1L, "creator", List.of(), Instant.now(), Instant.now());

        given(service.join(eq(10L))).willReturn(d);

        mockMvc.perform(post("/api/v1/sessions/10/join"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registeredPlayers").value(2));
    }

    @Test
    void leave_returns200WithDetail() throws Exception {
        SessionDetailResponse d = new SessionDetailResponse(
                10L, "Catan", null, 13L, "Catan",
                "MAD01", "Madrid", null, null,
                Instant.now().plus(1, ChronoUnit.DAYS), 4, 1,
                SessionStatus.OPEN, 1L, "creator", List.of(), Instant.now(), Instant.now());

        given(service.leave(eq(10L))).willReturn(d);

        mockMvc.perform(delete("/api/v1/sessions/10/join"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registeredPlayers").value(1));
    }
}
