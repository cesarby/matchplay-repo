package com.matchplay.user.controller;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.config.LocaleConfig;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.user.dto.ChangePasswordRequest;
import com.matchplay.user.dto.FavoriteGameSummary;
import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.service.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class MeControllerTest {

    @Autowired MessageSource messageSource;

    @Mock ProfileService profileService;

    MockMvc mockMvc;
    ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("es"));
        localeResolver.setSupportedLocales(List.of(new Locale("es"), Locale.ENGLISH));

        objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .setDefaultPropertyInclusion(JsonInclude.Include.NON_NULL);
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter(objectMapper);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new MeController(profileService))
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setMessageConverters(jsonConverter)
                .setValidator(new LocalValidatorFactoryBean())
                .build();
    }

    @Test
    void getCurrent_returns200WithProfile() throws Exception {
        given(profileService.getCurrent()).willReturn(new UserProfileResponse(
                "alice", "alice@a.es", "avatar_07", "Hello",
                List.of(new FavoriteGameSummary(13L, "Catan", "http://thumb"))
        ));

        mockMvc.perform(get("/api/v1/me/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.avatarCode").value("avatar_07"))
                .andExpect(jsonPath("$.bio").value("Hello"))
                .andExpect(jsonPath("$.favoriteGames[0].name").value("Catan"));
    }

    @Test
    void update_returns200WithUpdatedProfile() throws Exception {
        given(profileService.update(any(UpdateProfileRequest.class))).willReturn(new UserProfileResponse(
                "alice", "alice@a.es", "avatar_15", "new bio", List.of()
        ));

        String body = objectMapper.writeValueAsString(
                new UpdateProfileRequest("avatar_15", "new bio", null));

        mockMvc.perform(patch("/api/v1/me/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarCode").value("avatar_15"))
                .andExpect(jsonPath("$.bio").value("new bio"));
    }

    @Test
    void update_returns400OnInvalidAvatar() throws Exception {
        String body = objectMapper.writeValueAsString(
                new UpdateProfileRequest("not-an-avatar", null, null));

        mockMvc.perform(patch("/api/v1/me/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_returns204() throws Exception {
        String body = objectMapper.writeValueAsString(
                new ChangePasswordRequest("currentPass", "newPass123"));

        mockMvc.perform(post("/api/v1/me/profile/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());

        verify(profileService).changePassword("currentPass", "newPass123");
    }

    @Test
    void changePassword_returns400OnShortPassword() throws Exception {
        String body = objectMapper.writeValueAsString(
                new ChangePasswordRequest("currentPass", "short"));

        mockMvc.perform(post("/api/v1/me/profile/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
