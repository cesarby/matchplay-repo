package com.matchplay.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchplay.avatar.entity.Avatar;
import com.matchplay.avatar.repository.AvatarRepository;
import com.matchplay.geo.entity.Area;
import com.matchplay.geo.entity.City;
import com.matchplay.geo.entity.Province;
import com.matchplay.geo.repository.AreaRepository;
import com.matchplay.geo.repository.CityRepository;
import com.matchplay.geo.repository.ProvinceRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthFlowTest {

    private static final String COOKIE_NAME = "refresh_token";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Autowired ProvinceRepository provinceRepository;
    @Autowired CityRepository cityRepository;
    @Autowired AreaRepository areaRepository;
    @Autowired AvatarRepository avatarRepository;

    @BeforeEach
    void seedReferences() {
        Province province = new Province();
        province.setCode("08");
        province.setName("Barcelona");
        provinceRepository.save(province);

        City city = new City();
        city.setCode("08019");
        city.setName("Barcelona");
        city.setProvince(province);
        cityRepository.save(city);

        Area area = new Area();
        area.setCode("08019-001");
        area.setName("Eixample");
        area.setCity(city);
        areaRepository.save(area);

        Avatar avatar = new Avatar();
        avatar.setCode("avatar_01");
        avatar.setName("Default");
        avatar.setRequiredPoints(0);
        avatar.setDisplayOrder(1);
        avatar.setActive(true);
        avatarRepository.save(avatar);
    }

    @Test
    void fullFlow_register_login_me_refresh_logout_meReturns401() throws Exception {
        String registerBody = """
                {
                  "email": "ana@example.com",
                  "username": "anagamer",
                  "password": "Secreta1",
                  "name": "Ana Pérez",
                  "provinceCode": "08",
                  "cityCode": "08019",
                  "areaCode": "08019-001"
                }
                """;

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").exists())
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists(COOKIE_NAME))
                .andExpect(cookie().httpOnly(COOKIE_NAME, true))
                .andExpect(cookie().secure(COOKIE_NAME, false))           // dev/test
                .andExpect(cookie().path(COOKIE_NAME, "/api/v1/auth"))
                .andReturn();

        JsonNode reg = objectMapper.readTree(registerResult.getResponse().getContentAsString());
        String accessToken = reg.get("accessToken").asText();
        Cookie refreshCookie = registerResult.getResponse().getCookie(COOKIE_NAME);
        assertThat(refreshCookie).isNotNull();
        assertThat(refreshCookie.getValue()).isNotBlank();

        // /me con bearer válido
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@example.com"))
                .andExpect(jsonPath("$.selectedAvatarCode").value("avatar_01"));

        // /me sin bearer → 401
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        // login devuelve nuevo par (cookie nueva)
        String loginBody = """
                { "email": "ana@example.com", "password": "Secreta1" }
                """;
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(COOKIE_NAME))
                .andReturn();
        String newAccess = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("accessToken").asText();
        assertThat(newAccess).isNotBlank();

        // refresh rota: envía cookie, recibe nueva cookie (distinta) y nuevo access
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists(COOKIE_NAME))
                .andReturn();

        Cookie rotatedCookie = refreshResult.getResponse().getCookie(COOKIE_NAME);
        assertThat(rotatedCookie).isNotNull();
        assertThat(rotatedCookie.getValue()).isNotEqualTo(refreshCookie.getValue());

        // El refresh anterior ya no sirve
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("error.auth.refresh.invalid"));

        // logout revoca el rotado y limpia la cookie (Max-Age=0)
        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(rotatedCookie))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists(COOKIE_NAME))
                .andExpect(cookie().maxAge(COOKIE_NAME, 0));

        // tras logout, refresh con el revocado falla
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(rotatedCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_withoutCookie_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("error.auth.refresh.invalid"));
    }

    @Test
    void logout_withoutCookie_returns204AndClearsCookie() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists(COOKIE_NAME))
                .andExpect(cookie().maxAge(COOKIE_NAME, 0));
    }

    @Test
    void register_duplicateEmail_returns409() throws Exception {
        String body = """
                {
                  "email": "dup@example.com",
                  "username": "user1",
                  "password": "Secreta1",
                  "name": "Dup",
                  "provinceCode": "08",
                  "cityCode": "08019",
                  "areaCode": "08019-001"
                }
                """;
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        String dup = body.replace("\"username\": \"user1\"", "\"username\": \"user2\"");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(dup))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("error.auth.email.duplicate"));
    }

    @Test
    void register_invalidProvince_returns404() throws Exception {
        String body = """
                {
                  "email": "x@example.com",
                  "username": "userx",
                  "password": "Secreta1",
                  "name": "X",
                  "provinceCode": "99",
                  "cityCode": "08019",
                  "areaCode": "08019-001"
                }
                """;
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("error.geo.province.not.found"));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        String register = """
                {
                  "email": "ok@example.com",
                  "username": "okuser",
                  "password": "Secreta1",
                  "name": "OK",
                  "provinceCode": "08",
                  "cityCode": "08019",
                  "areaCode": "08019-001"
                }
                """;
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(register))
                .andExpect(status().isCreated());

        String wrong = """
                { "email": "ok@example.com", "password": "WrongPwd1" }
                """;
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(wrong))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("error.auth.invalid.credentials"));
    }

    @Test
    void register_weakPassword_returns400() throws Exception {
        String body = """
                {
                  "email": "weak@example.com",
                  "username": "weak",
                  "password": "soloLetras",
                  "name": "Weak",
                  "provinceCode": "08",
                  "cityCode": "08019",
                  "areaCode": "08019-001"
                }
                """;
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("error.validation"));
    }
}
