package com.matchplay.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.config.LocaleConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Import;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class GlobalExceptionHandlerTest {

    @Autowired
    MessageSource messageSource;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("es"));
        localeResolver.setSupportedLocales(List.of(new Locale("es"), Locale.ENGLISH));

        mockMvc = MockMvcBuilders
                .standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setMessageConverters(jsonConverter())
                .build();
    }

    private static MappingJackson2HttpMessageConverter jsonConverter() {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        return new MappingJackson2HttpMessageConverter(mapper);
    }

    @RestController
    @RequestMapping("/test")
    static class TestController {

        @GetMapping("/session-not-found")
        public void sessionNotFound() {
            throw new SessionNotFoundException(42L);
        }

        @GetMapping("/unauthorized")
        public void unauthorized() {
            throw new UnauthorizedActionException("error.unauthorized");
        }

        @GetMapping("/session-full")
        public void sessionFull() {
            throw new SessionFullException();
        }
    }

    @Test
    void whenSessionNotFound_returns404WithSpanishMessage() throws Exception {
        mockMvc.perform(get("/test/session-not-found")
                        .header("Accept-Language", "es"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("error.session.not.found"))
                .andExpect(jsonPath("$.message").value("La partida con id 42 no existe"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.path").value("/test/session-not-found"));
    }

    @Test
    void whenSessionNotFound_returns404WithEnglishMessage() throws Exception {
        mockMvc.perform(get("/test/session-not-found")
                        .header("Accept-Language", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Session with id 42 not found"));
    }

    @Test
    void whenUnauthorizedAction_returns403() throws Exception {
        mockMvc.perform(get("/test/unauthorized")
                        .header("Accept-Language", "es"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("error.unauthorized"))
                .andExpect(jsonPath("$.message").value("No tienes permiso para realizar esta acción"));
    }

    @Test
    void whenSessionFull_returns409() throws Exception {
        mockMvc.perform(get("/test/session-full")
                        .header("Accept-Language", "es"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("error.session.full"))
                .andExpect(jsonPath("$.message").value("La partida está completa, no hay plazas disponibles"));
    }
}
