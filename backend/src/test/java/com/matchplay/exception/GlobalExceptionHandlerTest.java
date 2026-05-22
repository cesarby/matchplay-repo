package com.matchplay.exception;

import com.matchplay.config.LocaleConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)
@Import({GlobalExceptionHandler.class, LocaleConfig.class})
class GlobalExceptionHandlerTest {

    @Autowired
    MockMvc mockMvc;

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
    @WithMockUser
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
    @WithMockUser
    void whenSessionNotFound_returns404WithEnglishMessage() throws Exception {
        mockMvc.perform(get("/test/session-not-found")
                        .header("Accept-Language", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Session with id 42 not found"));
    }

    @Test
    @WithMockUser
    void whenUnauthorizedAction_returns403() throws Exception {
        mockMvc.perform(get("/test/unauthorized")
                        .header("Accept-Language", "es"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("error.unauthorized"))
                .andExpect(jsonPath("$.message").value("No tienes permiso para realizar esta acción"));
    }

    @Test
    @WithMockUser
    void whenSessionFull_returns409() throws Exception {
        mockMvc.perform(get("/test/session-full")
                        .header("Accept-Language", "es"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("error.session.full"))
                .andExpect(jsonPath("$.message").value("La partida está completa, no hay plazas disponibles"));
    }
}
