package com.matchplay.session.mapper;

import com.matchplay.game.entity.Game;
import com.matchplay.geo.entity.City;
import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.user.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class SessionMapperTest {

    private final SessionMapper mapper = new SessionMapper();

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    // ---------- helpers ----------

    private User user(Long id, String username) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        return u;
    }

    private GameSession minimalSession(Game baseGame) {
        City city = new City();
        city.setCode("MAD01");
        city.setName("Madrid");

        GameSession s = new GameSession();
        s.setId(1L);
        s.setTitle("Test Session");
        s.setCreator(user(1L, "creator"));
        s.setBaseGame(baseGame);
        s.setCity(city);
        s.setScheduledAt(Instant.now().plus(1, ChronoUnit.DAYS));
        s.setMaxPlayers(4);
        s.setRegisteredPlayers(1);
        s.setStatus(SessionStatus.OPEN);
        return s;
    }

    private Game gameWithSummaries(String summaryEs, String summaryEn) {
        Game g = new Game();
        g.setBggId(42L);
        g.setName("Test Game");
        g.setSummaryEs(summaryEs);
        g.setSummaryEn(summaryEn);
        return g;
    }

    // ---------- locale-selection tests ----------

    @Test
    void toDetail_picksSpanishSummaryWhenLocaleEs() {
        LocaleContextHolder.setLocale(Locale.forLanguageTag("es"));
        GameSession s = minimalSession(gameWithSummaries("Resumen ES", "Summary EN"));

        SessionDetailResponse out = mapper.toDetail(s, List.of(), null, null, null);

        assertThat(out.baseGameSummary()).isEqualTo("Resumen ES");
    }

    @Test
    void toDetail_picksEnglishSummaryWhenLocaleEn() {
        LocaleContextHolder.setLocale(Locale.forLanguageTag("en"));
        GameSession s = minimalSession(gameWithSummaries("Resumen ES", "Summary EN"));

        SessionDetailResponse out = mapper.toDetail(s, List.of(), null, null, null);

        assertThat(out.baseGameSummary()).isEqualTo("Summary EN");
    }

    @Test
    void toDetail_fallsBackToSpanishForUnknownLocale() {
        LocaleContextHolder.setLocale(Locale.forLanguageTag("fr"));
        GameSession s = minimalSession(gameWithSummaries("Resumen ES", "Summary EN"));

        SessionDetailResponse out = mapper.toDetail(s, List.of(), null, null, null);

        assertThat(out.baseGameSummary()).isEqualTo("Resumen ES");
    }

    @Test
    void toDetail_returnsNullSummaryWhenBaseGameIsNull() {
        LocaleContextHolder.setLocale(Locale.forLanguageTag("es"));
        GameSession s = minimalSession(null);

        SessionDetailResponse out = mapper.toDetail(s, List.of(), null, null, null);

        assertThat(out.baseGameSummary()).isNull();
    }

    // ---------- toSummary expansionNames tests ----------

    @Test
    void toSummary_withExpansionNames_includesNames() {
        GameSession s = minimalSession(gameWithSummaries(null, null));
        Game expA = new Game(); expA.setBggId(100L); expA.setName("Expansion A");
        Game expB = new Game(); expB.setBggId(101L); expB.setName("Expansion B");
        s.setExpansions(List.of(expA, expB));

        SessionSummaryResponse out = mapper.toSummary(s, 0, true);

        assertThat(out.expansionNames()).containsExactly("Expansion A", "Expansion B");
    }

    @Test
    void toSummary_withoutFlag_leavesExpansionNamesNull() {
        GameSession s = minimalSession(gameWithSummaries(null, null));
        Game exp = new Game(); exp.setBggId(100L); exp.setName("Expansion A");
        s.setExpansions(List.of(exp));

        SessionSummaryResponse out = mapper.toSummary(s, 0);

        assertThat(out.expansionNames()).isNull();
    }

    @Test
    void toSummary_withFlagButNoExpansions_returnsNullNames() {
        GameSession s = minimalSession(gameWithSummaries(null, null));
        s.setExpansions(List.of());

        SessionSummaryResponse out = mapper.toSummary(s, 0, true);

        assertThat(out.expansionNames()).isNullOrEmpty();
    }
}
