package com.matchplay.stats.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchplay.stats.dto.PublicStatsResponse;
import com.matchplay.stats.service.PublicStatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
class PublicStatsControllerTest {

    @Mock PublicStatsService service;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        ObjectMapper objectMapper = new ObjectMapper();
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter(objectMapper);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new PublicStatsController(service))
                .setMessageConverters(jsonConverter)
                .build();
    }

    @Test
    void getPublicStats_returns200WithBody() throws Exception {
        given(service.getPublicStats()).willReturn(new PublicStatsResponse(142L, 387L, 24L));

        mockMvc.perform(get("/api/v1/stats/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeSessions").value(142))
                .andExpect(jsonPath("$.activePlayers").value(387))
                .andExpect(jsonPath("$.cities").value(24));
    }

    @Test
    void getPublicStats_setsCacheControlHeader() throws Exception {
        given(service.getPublicStats()).willReturn(new PublicStatsResponse(0L, 0L, 0L));

        mockMvc.perform(get("/api/v1/stats/public"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "max-age=300, public"));
    }
}
