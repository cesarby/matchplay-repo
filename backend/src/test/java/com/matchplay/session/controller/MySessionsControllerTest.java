package com.matchplay.session.controller;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.common.dto.PageResponse;
import com.matchplay.config.LocaleConfig;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.session.dto.MySessionsResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.dto.TabCounts;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.service.MySessionsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
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
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class MySessionsControllerTest {

    @Autowired MessageSource messageSource;

    @Mock MySessionsService service;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("es"));
        localeResolver.setSupportedLocales(List.of(new Locale("es"), Locale.ENGLISH));

        ObjectMapper objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .setDefaultPropertyInclusion(JsonInclude.Include.NON_NULL);
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter(objectMapper);

        mockMvc = MockMvcBuilders
                .standaloneSetup(new MySessionsController(service))
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setMessageConverters(jsonConverter)
                .build();
    }

    private MySessionsResponse emptyResponse() {
        return new MySessionsResponse(
                new PageResponse<>(List.<SessionSummaryResponse>of(), 0, 20, 0L, 0, true),
                new TabCounts(0L, 0L, 0L, 0L)
        );
    }

    private MySessionsResponse oneItemResponse() {
        SessionSummaryResponse s = new SessionSummaryResponse(
                1L, "S", 13L, "Catan", null, 0,
                "MAD01", "Madrid", null, null,
                Instant.now(), 4, 1, 0,
                SessionStatus.OPEN, 1L, "me", null, null);
        return new MySessionsResponse(
                new PageResponse<>(List.of(s), 0, 20, 1L, 1, true),
                new TabCounts(1L, 0L, 0L, 0L)
        );
    }

    @Test
    void findMine_returns200WithDefaultTab() throws Exception {
        given(service.findMine(eq(MySessionsService.Tab.CREATED), any(Pageable.class)))
                .willReturn(oneItemResponse());

        mockMvc.perform(get("/api/v1/me/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.content[0].id").value(1))
                .andExpect(jsonPath("$.counts.created").value(1));
    }

    @Test
    void findMine_acceptsTabParam() throws Exception {
        given(service.findMine(eq(MySessionsService.Tab.HISTORY), any(Pageable.class)))
                .willReturn(emptyResponse());

        mockMvc.perform(get("/api/v1/me/sessions").param("tab", "HISTORY"))
                .andExpect(status().isOk());

        verify(service).findMine(eq(MySessionsService.Tab.HISTORY), any(Pageable.class));
    }

    @Test
    void findMine_returns400_whenInvalidTab() throws Exception {
        mockMvc.perform(get("/api/v1/me/sessions").param("tab", "INVALID"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void findMine_clampsPageSizeTo50() throws Exception {
        given(service.findMine(any(MySessionsService.Tab.class), any(Pageable.class)))
                .willReturn(emptyResponse());

        mockMvc.perform(get("/api/v1/me/sessions").param("size", "999"))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(service).findMine(eq(MySessionsService.Tab.CREATED), captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getPageSize()).isEqualTo(50);
    }
}
