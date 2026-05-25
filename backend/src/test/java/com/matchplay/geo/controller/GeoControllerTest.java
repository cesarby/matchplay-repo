package com.matchplay.geo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.matchplay.config.LocaleConfig;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.geo.dto.AreaResponse;
import com.matchplay.geo.dto.CityResponse;
import com.matchplay.geo.dto.ProvinceResponse;
import com.matchplay.geo.exception.GeoCodeNotFoundException;
import com.matchplay.geo.service.GeoService;
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

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@Import(LocaleConfig.class)
class GeoControllerTest {

    @Autowired MessageSource messageSource;

    @Mock GeoService service;

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
                .standaloneSetup(new GeoController(service))
                .setControllerAdvice(new GlobalExceptionHandler(messageSource))
                .setLocaleResolver(localeResolver)
                .setMessageConverters(jsonConverter)
                .build();
    }

    @Test
    void provinces_returns200WithList() throws Exception {
        given(service.listProvinces()).willReturn(List.of(
                new ProvinceResponse("01", "Álava"),
                new ProvinceResponse("08", "Barcelona")
        ));

        mockMvc.perform(get("/api/v1/geo/provinces"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].code").value("01"))
                .andExpect(jsonPath("$[1].name").value("Barcelona"));
    }

    @Test
    void provinces_setsCacheControlHeader() throws Exception {
        given(service.listProvinces()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/geo/provinces"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "max-age=86400, public"));
    }

    @Test
    void cities_withProvinceCode_returns200() throws Exception {
        given(service.listCitiesByProvince("08")).willReturn(List.of(
                new CityResponse("08019", "Barcelona", "08")
        ));

        mockMvc.perform(get("/api/v1/geo/cities").param("provinceCode", "08"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provinceCode").value("08"));
    }

    @Test
    void cities_withoutProvinceCode_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/geo/cities"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("error.validation"));
    }

    @Test
    void cities_provinceNotFound_returns404() throws Exception {
        willThrow(new GeoCodeNotFoundException("error.geo.province.not.found", "99"))
                .given(service).listCitiesByProvince("99");

        mockMvc.perform(get("/api/v1/geo/cities").param("provinceCode", "99")
                        .header("Accept-Language", "es"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("error.geo.province.not.found"))
                .andExpect(jsonPath("$.message").value("La provincia con código 99 no existe"));
    }

    @Test
    void areas_withCityCode_returns200() throws Exception {
        given(service.listAreasByCity("08019")).willReturn(List.of(
                new AreaResponse("08019-001", "Eixample", "08019")
        ));

        mockMvc.perform(get("/api/v1/geo/areas").param("cityCode", "08019"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cityCode").value("08019"));
    }

    @Test
    void areas_withoutCityCode_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/geo/areas"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("error.validation"));
    }

    @Test
    void areas_cityNotFound_returns404() throws Exception {
        willThrow(new GeoCodeNotFoundException("error.geo.city.not.found", "99999"))
                .given(service).listAreasByCity("99999");

        mockMvc.perform(get("/api/v1/geo/areas").param("cityCode", "99999")
                        .header("Accept-Language", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("error.geo.city.not.found"))
                .andExpect(jsonPath("$.message").value("City with code 99999 not found"));
    }
}
