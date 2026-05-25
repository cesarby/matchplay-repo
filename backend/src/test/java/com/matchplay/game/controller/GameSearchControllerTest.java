package com.matchplay.game.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.config.LocaleConfig;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.game.dto.GameSearchResponse;
import com.matchplay.game.dto.GameSearchType;
import com.matchplay.game.dto.GameSearchTypeConverter;
import com.matchplay.common.dto.PageResponse;
import com.matchplay.game.exception.BaseGameNotFoundException;
import com.matchplay.game.exception.BggUnavailableException;
import com.matchplay.game.exception.InvalidGameSearchException;
import com.matchplay.game.service.GameSearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Import;
import org.springframework.format.support.FormattingConversionService;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class GameSearchControllerTest {

    @Autowired MessageSource messageSource;

    @Mock GameSearchService service;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("es"));
        localeResolver.setSupportedLocales(List.of(new Locale("es"), Locale.ENGLISH));

        FormattingConversionService conversionService = new FormattingConversionService();
        conversionService.addConverter(new GameSearchTypeConverter());

        ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter(objectMapper);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new GameSearchController(service))
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setConversionService(conversionService)
                .setMessageConverters(jsonConverter)
                .build();
    }

    @Test
    void search_happyPath_returns200WithPage() throws Exception {
        GameSearchResponse one = new GameSearchResponse(
                13L, "Catan", 1995, 3, 4, 60, 120,
                "thumb.jpg", "image.jpg", false, true, null);
        PageResponse<GameSearchResponse> page = new PageResponse<>(List.of(one), 0, 20, 1, 1, true);

        given(service.search(eq("catan"), eq(GameSearchType.BASE), eq(null), anyInt(), anyInt()))
                .willReturn(page);

        mockMvc.perform(get("/api/v1/games").param("q", "catan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].bggId").value(13))
                .andExpect(jsonPath("$.content[0].name").value("Catan"))
                .andExpect(jsonPath("$.content[0].hasExpansions").value(true))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void search_invalidParam_returns400() throws Exception {
        given(service.search(any(), eq(GameSearchType.BASE), any(), anyInt(), anyInt()))
                .willThrow(new InvalidGameSearchException("error.games.query.required"));

        mockMvc.perform(get("/api/v1/games").header("Accept-Language", "es"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("error.games.query.required"))
                .andExpect(jsonPath("$.message").value(
                        "El texto de búsqueda es obligatorio y debe tener al menos 2 caracteres"));
    }

    @Test
    void search_baseGameNotFound_returns404() throws Exception {
        given(service.search(any(), eq(GameSearchType.EXPANSION), eq(999L), anyInt(), anyInt()))
                .willThrow(new BaseGameNotFoundException(999L));

        mockMvc.perform(get("/api/v1/games")
                        .param("type", "expansion")
                        .param("baseGameId", "999")
                        .header("Accept-Language", "es"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("error.games.base.not.found"))
                .andExpect(jsonPath("$.message").value(
                        "El juego base con bggId 999 no existe en BoardGameGeek"));
    }

    @Test
    void search_bggUnavailable_returns502() throws Exception {
        given(service.search(any(), eq(GameSearchType.BASE), any(), anyInt(), anyInt()))
                .willThrow(new BggUnavailableException(new IOException("boom")));

        mockMvc.perform(get("/api/v1/games").param("q", "catan").header("Accept-Language", "es"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("error.games.bgg.unavailable"));
    }

    @Test
    void search_invalidTypeValue_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/games")
                        .param("q", "catan")
                        .param("type", "bogus")
                        .header("Accept-Language", "es"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("error.games.type.invalid"));
    }
}
