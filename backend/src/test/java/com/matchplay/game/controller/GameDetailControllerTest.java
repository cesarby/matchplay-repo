package com.matchplay.game.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.config.LocaleConfig;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.game.entity.Game;
import com.matchplay.game.repository.GameRepository;
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

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class GameDetailControllerTest {

    @Autowired MessageSource messageSource;

    @Mock GameRepository gameRepository;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("es"));
        localeResolver.setSupportedLocales(List.of(new Locale("es"), Locale.ENGLISH));

        ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter(objectMapper);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new GameDetailController(gameRepository))
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setMessageConverters(jsonConverter)
                .build();
    }

    @Test
    void findById_returns200WithSpanishSummaryByDefault() throws Exception {
        Game g = new Game();
        g.setBggId(42L);
        g.setName("Ark Nova");
        g.setSummaryEs("Resumen ES");
        g.setSummaryEn("Summary EN");
        g.setMinPlayers(1);
        g.setMaxPlayers(4);
        when(gameRepository.findById(42L)).thenReturn(Optional.of(g));

        mockMvc.perform(get("/api/v1/games/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bggId").value(42))
                .andExpect(jsonPath("$.name").value("Ark Nova"))
                .andExpect(jsonPath("$.summary").value("Resumen ES"));
    }

    @Test
    void findById_returns200WithEnglishSummaryWhenAcceptLanguageEn() throws Exception {
        Game g = new Game();
        g.setBggId(42L);
        g.setName("Ark Nova");
        g.setSummaryEs("Resumen ES");
        g.setSummaryEn("Summary EN");
        g.setMinPlayers(1);
        g.setMaxPlayers(4);
        when(gameRepository.findById(42L)).thenReturn(Optional.of(g));

        mockMvc.perform(get("/api/v1/games/42").header("Accept-Language", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary").value("Summary EN"));
    }

    @Test
    void findById_returns404WhenNotCached() throws Exception {
        when(gameRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/games/999").header("Accept-Language", "es"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("error.games.base.not.found"));
    }
}
