package com.matchplay.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.matchplay.user.dto.FavoriteGameSummary;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.service.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MeControllerTest {

    @Mock ProfileService profileService;
    @InjectMocks MeController controller;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ObjectMapper om = new ObjectMapper();
        om.setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE);
        MappingJackson2HttpMessageConverter conv = new MappingJackson2HttpMessageConverter(om);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setMessageConverters(conv).build();
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
}
