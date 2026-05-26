package com.matchplay.session.service;

import com.matchplay.exception.SessionAlreadyJoinedException;
import com.matchplay.exception.SessionEmptyCannotCloseException;
import com.matchplay.exception.SessionExpansionNotExpansionException;
import com.matchplay.exception.SessionExpansionWrongBaseException;
import com.matchplay.exception.SessionGuestsExceedMaxException;
import com.matchplay.exception.SessionJoinOwnException;
import com.matchplay.exception.SessionMaxPlayersAboveGameException;
import com.matchplay.exception.SessionMaxPlayersBelowGameMinException;
import com.matchplay.exception.SessionNotFoundException;
import com.matchplay.exception.SessionScheduledInPastException;
import com.matchplay.exception.SessionStatusTransitionException;
import com.matchplay.exception.UnauthorizedActionException;
import com.matchplay.game.entity.Game;
import com.matchplay.game.service.GameService;
import com.matchplay.geo.entity.City;
import com.matchplay.geo.repository.AreaRepository;
import com.matchplay.geo.repository.CityRepository;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.ChangeStatusRequest;
import com.matchplay.session.dto.CreateSessionRequest;
import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.UpdateSessionRequest;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.entity.SessionParticipant;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.SessionParticipantRepository;
import com.matchplay.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GameSessionServiceImplTest {

    @Mock GameSessionRepository sessionRepository;
    @Mock SessionParticipantRepository participantRepository;
    @Mock GameService gameService;
    @Mock CityRepository cityRepository;
    @Mock AreaRepository areaRepository;
    @Mock CurrentUserProvider currentUserProvider;
    @Mock SessionMapper mapper;

    @InjectMocks GameSessionServiceImpl service;

    User creator;
    User joiner;
    User secondJoiner;
    Game game;
    City city;

    @BeforeEach
    void setUp() {
        creator = user(1L, "creator");
        joiner = user(2L, "joiner");
        secondJoiner = user(3L, "joiner2");
        game = new Game();
        game.setBggId(13L);
        game.setName("Catan");
        game.setMinPlayers(3);
        game.setMaxPlayers(4);
        city = new City();
        city.setCode("MAD01");
        city.setName("Madrid");
    }

    // ---------- CREATE ----------

    @Test
    void create_withFutureDate_persistsAndAddsCreatorAsPlayer() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, null, "MAD01", null, future, 4, null);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);
        given(cityRepository.findById("MAD01")).willReturn(Optional.of(city));
        given(sessionRepository.save(any(GameSession.class))).willAnswer(inv -> {
            GameSession s = inv.getArgument(0);
            s.setId(99L);
            return s;
        });
        given(mapper.toDetail(any(GameSession.class), any(), any())).willReturn(detail(99L, SessionStatus.OPEN));

        SessionDetailResponse result = service.create(req);

        assertThat(result.id()).isEqualTo(99L);
        verify(sessionRepository).save(any(GameSession.class));

        // El creador queda auto-apuntado como PLAYER y registeredPlayers=1.
        ArgumentCaptor<GameSession> sessionCaptor = ArgumentCaptor.forClass(GameSession.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        assertThat(sessionCaptor.getValue().getRegisteredPlayers()).isEqualTo(1);

        ArgumentCaptor<SessionParticipant> participantCaptor =
                ArgumentCaptor.forClass(SessionParticipant.class);
        verify(participantRepository).save(participantCaptor.capture());
        SessionParticipant savedParticipant = participantCaptor.getValue();
        assertThat(savedParticipant.getUser()).isSameAs(creator);
        assertThat(savedParticipant.getRole()).isEqualTo(ParticipantRole.PLAYER);
    }

    @Test
    void create_withPastDate_throws() {
        Instant past = Instant.now().minus(1, ChronoUnit.HOURS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, null, "MAD01", null, past, 4, null);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionScheduledInPastException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void create_maxAboveGameMax_throws() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, null, "MAD01", null, future, 6, null); // game.max = 4

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionMaxPlayersAboveGameException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void create_maxBelowGameMin_throws() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, null, "MAD01", null, future, 2, null); // game.min = 3

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionMaxPlayersBelowGameMinException.class);
    }

    @Test
    void create_withCreatorGuests_leavesAtLeastOneFreeSpotAndStatusOpen() {
        // maxPlayers=4, guests=2 → registered=3, queda 1 plaza libre → OPEN.
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan", "Desc", 13L, null, "MAD01", null, future, 4, 2);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);
        given(cityRepository.findById("MAD01")).willReturn(Optional.of(city));
        given(sessionRepository.save(any(GameSession.class))).willAnswer(inv -> {
            GameSession s = inv.getArgument(0);
            s.setId(50L);
            return s;
        });
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(50L, SessionStatus.OPEN));

        service.create(req);

        ArgumentCaptor<GameSession> captor = ArgumentCaptor.forClass(GameSession.class);
        verify(sessionRepository).save(captor.capture());
        GameSession saved = captor.getValue();
        assertThat(saved.getCreatorGuests()).isEqualTo(2);
        assertThat(saved.getRegisteredPlayers()).isEqualTo(3); // 1 creador + 2 acompañantes
        assertThat(saved.getStatus()).isEqualTo(SessionStatus.OPEN);
    }

    @Test
    void create_withGuestsFillingExactly_throws() {
        // maxPlayers=3, guests=2 → registered=3 = max → no queda plaza para
        // otros usuarios → la regla obliga a ≥ 1 libre → rechaza.
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan", "Desc", 13L, null, "MAD01", null, future, 3, 2);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionGuestsExceedMaxException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void create_withTooManyGuests_throws() {
        // maxPlayers=4, guests=4 → 1+4=5 > 4 → rechaza.
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan", "Desc", 13L, null, "MAD01", null, future, 4, 4);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionGuestsExceedMaxException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void create_gameWithoutLimits_skipsValidation() {
        // Si BGG no aporta min/max, no se valida ese lado
        Game cooperative = new Game();
        cooperative.setBggId(50L);
        cooperative.setName("Pandemic Legacy");
        cooperative.setMinPlayers(null);
        cooperative.setMaxPlayers(null);

        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Pandemic", "Desc", 50L, null, "MAD01", null, future, 10, null);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(50L)).willReturn(cooperative);
        given(cityRepository.findById("MAD01")).willReturn(Optional.of(city));
        given(sessionRepository.save(any())).willAnswer(inv -> {
            GameSession s = inv.getArgument(0);
            s.setId(7L);
            return s;
        });
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(7L, SessionStatus.OPEN));

        service.create(req); // no debe lanzar
    }

    // ---------- CREATE con expansiones ----------

    @Test
    void create_withValidExpansions_persistsThemInOrderWithoutDuplicates() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        Game seafarers = expansion(325L, "Catan: Seafarers", 13L);
        Game cities    = expansion(926L, "Catan: Cities & Knights", 13L);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan+exp", "Desc", 13L,
                List.of(325L, 926L, 325L), // duplicado a propósito
                "MAD01", null, future, 4, null);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);
        given(gameService.findOrFetch(325L)).willReturn(seafarers);
        given(gameService.findOrFetch(926L)).willReturn(cities);
        given(cityRepository.findById("MAD01")).willReturn(Optional.of(city));
        given(sessionRepository.save(any(GameSession.class))).willAnswer(inv -> {
            GameSession s = inv.getArgument(0);
            s.setId(101L);
            return s;
        });
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(101L, SessionStatus.OPEN));

        service.create(req);

        ArgumentCaptor<GameSession> captor = ArgumentCaptor.forClass(GameSession.class);
        verify(sessionRepository).save(captor.capture());
        GameSession saved = captor.getValue();
        // Dedupe silencioso + orden de inserción preservado
        assertThat(saved.getExpansions()).extracting(Game::getBggId).containsExactly(325L, 926L);
        // findOrFetch del duplicado se llama solo una vez (LinkedHashSet dedupe)
        verify(gameService, times(1)).findOrFetch(325L);
    }

    @Test
    void create_withExpansionOfDifferentBase_throws() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        Game wrongExp = expansion(999L, "Wingspan: Oceania", 99L); // base distinto
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan", "Desc", 13L, List.of(999L),
                "MAD01", null, future, 4, null);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);
        given(cityRepository.findById("MAD01")).willReturn(Optional.of(city));
        given(gameService.findOrFetch(999L)).willReturn(wrongExp);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionExpansionWrongBaseException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void create_withBaseGameInExpansionList_throws() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        // Otro juego base (no expansion) intentando colarse
        Game otherBase = new Game();
        otherBase.setBggId(77L);
        otherBase.setName("Wingspan");
        otherBase.setExpansion(false);

        CreateSessionRequest req = new CreateSessionRequest(
                "Catan", "Desc", 13L, List.of(77L),
                "MAD01", null, future, 4, null);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameService.findOrFetch(13L)).willReturn(game);
        given(cityRepository.findById("MAD01")).willReturn(Optional.of(city));
        given(gameService.findOrFetch(77L)).willReturn(otherBase);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionExpansionNotExpansionException.class);
    }

    // ---------- UPDATE: expansiones ----------

    @Test
    void update_withNullExpansions_keepsExistingList() {
        GameSession session = openSession(4, 0);
        Game existingExp = expansion(325L, "Seafarers", 13L);
        session.getExpansions().add(existingExp);

        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        given(sessionRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(1L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        service.update(10L, new UpdateSessionRequest("Nuevo título", null, null, null, null, null));

        assertThat(session.getExpansions()).extracting(Game::getBggId).containsExactly(325L);
    }

    @Test
    void update_withEmptyExpansionsList_clearsThem() {
        GameSession session = openSession(4, 0);
        Game existingExp = expansion(325L, "Seafarers", 13L);
        session.getExpansions().add(existingExp);

        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        given(sessionRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(1L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        service.update(10L, new UpdateSessionRequest(null, null, null, null, null, List.of()));

        assertThat(session.getExpansions()).isEmpty();
    }

    @Test
    void update_withNewExpansionsList_replacesEntirely() {
        GameSession session = openSession(4, 0);
        Game oldExp = expansion(325L, "Seafarers", 13L);
        session.getExpansions().add(oldExp);

        Game newExp = expansion(926L, "Cities & Knights", 13L);

        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        given(gameService.findOrFetch(926L)).willReturn(newExp);
        given(sessionRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(1L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        service.update(10L, new UpdateSessionRequest(null, null, null, null, null, List.of(926L)));

        assertThat(session.getExpansions()).extracting(Game::getBggId).containsExactly(926L);
    }

    // ---------- FIND ----------

    @Test
    void findById_whenMissing_throws() {
        given(sessionRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(SessionNotFoundException.class);
    }

    @Test
    void getDetail_includesGameSummaryInSpanishByDefault() {
        GameSession s = openSession(4, 0);
        s.getBaseGame().setSummaryEs("Resumen ES");
        s.getBaseGame().setSummaryEn("Summary EN");
        given(sessionRepository.findById(s.getId())).willReturn(Optional.of(s));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
                .willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.empty());
        SessionDetailResponse expected = detail(s.getId(), SessionStatus.OPEN);
        given(mapper.toDetail(any(GameSession.class), any(), any())).willReturn(expected);

        SessionDetailResponse out = service.findById(s.getId());

        assertThat(out).isSameAs(expected);
        verify(mapper).toDetail(any(GameSession.class), any(), any());
    }

    // ---------- JOIN ----------

    @Test
    void join_happyPath_savesParticipantAndIncrementsCount() {
        GameSession session = openSession(4, 0);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.existsBySessionIdAndUserId(10L, 2L)).willReturn(false);
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(2L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        service.join(10L);

        verify(participantRepository).save(any(SessionParticipant.class));
        assertThat(session.getRegisteredPlayers()).isEqualTo(1);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.OPEN);
    }

    @Test
    void join_transitionsToFullWhenLastSpot() {
        GameSession session = openSession(2, 1);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.existsBySessionIdAndUserId(10L, 2L)).willReturn(false);
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(2L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.FULL));

        service.join(10L);

        assertThat(session.getRegisteredPlayers()).isEqualTo(2);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.FULL);
    }

    @Test
    void join_ownSession_throws() {
        GameSession session = openSession(4, 0);
        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));

        assertThatThrownBy(() -> service.join(10L))
                .isInstanceOf(SessionJoinOwnException.class);
    }

    @Test
    void join_alreadyJoined_throws() {
        GameSession session = openSession(4, 1);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.existsBySessionIdAndUserId(10L, 2L)).willReturn(true);

        assertThatThrownBy(() -> service.join(10L))
                .isInstanceOf(SessionAlreadyJoinedException.class);
    }

    // ---------- JOIN waitlist ----------

    @Test
    void join_fullSession_addsToWaitlistAtPosition1() {
        GameSession session = openSession(2, 2);
        session.setStatus(SessionStatus.FULL);

        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.existsBySessionIdAndUserId(10L, 2L)).willReturn(false);
        given(participantRepository.findMaxPositionBySessionIdAndRole(10L, ParticipantRole.WAITLIST)).willReturn(0);
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(2L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.FULL));

        service.join(10L);

        ArgumentCaptor<SessionParticipant> captor = ArgumentCaptor.forClass(SessionParticipant.class);
        verify(participantRepository).save(captor.capture());
        SessionParticipant saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(ParticipantRole.WAITLIST);
        assertThat(saved.getPosition()).isEqualTo(1);
        // registered/status no cambian
        assertThat(session.getRegisteredPlayers()).isEqualTo(2);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.FULL);
    }

    @Test
    void join_waitlistUnlimited_acceptsBeyondMaxPlayers() {
        // Aunque ya haya 10 en waitlist con maxPlayers=2, se sigue admitiendo
        GameSession session = openSession(2, 2);
        session.setStatus(SessionStatus.FULL);

        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.existsBySessionIdAndUserId(10L, 2L)).willReturn(false);
        given(participantRepository.findMaxPositionBySessionIdAndRole(10L, ParticipantRole.WAITLIST))
                .willReturn(10);
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(2L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.FULL));

        service.join(10L);

        ArgumentCaptor<SessionParticipant> captor = ArgumentCaptor.forClass(SessionParticipant.class);
        verify(participantRepository).save(captor.capture());
        SessionParticipant saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(ParticipantRole.WAITLIST);
        assertThat(saved.getPosition()).isEqualTo(11);
    }

    @Test
    void join_cancelledSession_throws() {
        GameSession session = openSession(4, 1);
        session.setStatus(SessionStatus.CANCELLED);

        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));

        assertThatThrownBy(() -> service.join(10L))
                .isInstanceOf(SessionStatusTransitionException.class);
    }

    // ---------- LEAVE ----------

    @Test
    void leave_player_decrementsAndPromotesWaitlist() {
        GameSession session = openSession(2, 2);
        session.setStatus(SessionStatus.FULL);

        SessionParticipant me = participant(joiner, ParticipantRole.PLAYER, null);
        SessionParticipant first = participant(secondJoiner, ParticipantRole.WAITLIST, 1);

        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.findBySessionIdAndUserId(10L, 2L)).willReturn(Optional.of(me));
        given(participantRepository.findFirstBySessionIdAndRoleOrderByPositionAsc(10L, ParticipantRole.WAITLIST))
                .willReturn(Optional.of(first));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of(first));
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(2L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.FULL));

        service.leave(10L);

        // primero en cola fue promovido
        assertThat(first.getRole()).isEqualTo(ParticipantRole.PLAYER);
        assertThat(first.getPosition()).isNull();
        assertThat(first.getPromotedAt()).isNotNull();
        // registered se quedó igual (decremento + promote)
        assertThat(session.getRegisteredPlayers()).isEqualTo(2);
        // status FULL se mantiene porque la plaza vacante se rellenó
        assertThat(session.getStatus()).isEqualTo(SessionStatus.FULL);
    }

    @Test
    void leave_playerNoWaitlist_transitionsFullToOpen() {
        GameSession session = openSession(2, 2);
        session.setStatus(SessionStatus.FULL);

        SessionParticipant me = participant(joiner, ParticipantRole.PLAYER, null);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.findBySessionIdAndUserId(10L, 2L)).willReturn(Optional.of(me));
        given(participantRepository.findFirstBySessionIdAndRoleOrderByPositionAsc(10L, ParticipantRole.WAITLIST))
                .willReturn(Optional.empty());
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(2L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        service.leave(10L);

        assertThat(session.getRegisteredPlayers()).isEqualTo(1);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.OPEN);
    }

    @Test
    void leave_waitlistMember_doesNotDecrementOrPromote() {
        GameSession session = openSession(2, 2);
        session.setStatus(SessionStatus.FULL);

        SessionParticipant me = participant(joiner, ParticipantRole.WAITLIST, 1);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.findBySessionIdAndUserId(10L, 2L)).willReturn(Optional.of(me));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(2L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.FULL));

        service.leave(10L);

        // registered y status sin cambios
        assertThat(session.getRegisteredPlayers()).isEqualTo(2);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.FULL);
        verify(participantRepository, never())
                .findFirstBySessionIdAndRoleOrderByPositionAsc(any(), any());
    }

    @Test
    void leave_whenNotParticipant_throwsUnauthorized() {
        GameSession session = openSession(4, 1);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.findBySessionIdAndUserId(10L, 2L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.leave(10L))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    @Test
    void leave_byCreator_throwsUnauthorized() {
        // El creador (auto-apuntado al crear) no puede usar leave; debe cancelar.
        GameSession session = openSession(4, 1);
        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));

        assertThatThrownBy(() -> service.leave(10L))
                .isInstanceOf(UnauthorizedActionException.class);
        // No se llega ni a buscar el participante
        verify(participantRepository, never()).findBySessionIdAndUserId(any(), any());
    }

    // ---------- UPDATE: max increased promotes waitlist ----------

    @Test
    void update_increaseMaxPlayers_promotesWaitlistUntilFull() {
        GameSession session = openSession(2, 2);
        session.setStatus(SessionStatus.FULL);

        SessionParticipant w1 = participant(secondJoiner, ParticipantRole.WAITLIST, 1);
        SessionParticipant w2 = participant(user(4L, "j3"), ParticipantRole.WAITLIST, 2);

        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        // primera llamada devuelve w1, segunda w2, tercera empty
        given(participantRepository.findFirstBySessionIdAndRoleOrderByPositionAsc(10L, ParticipantRole.WAITLIST))
                .willReturn(Optional.of(w1))
                .willReturn(Optional.of(w2))
                .willReturn(Optional.empty());
        given(sessionRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(1L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.FULL));

        service.update(10L, new UpdateSessionRequest(null, null, null, null, 4, null));

        // ambos waitlist promocionados
        assertThat(w1.getRole()).isEqualTo(ParticipantRole.PLAYER);
        assertThat(w2.getRole()).isEqualTo(ParticipantRole.PLAYER);
        assertThat(session.getRegisteredPlayers()).isEqualTo(4);
        assertThat(session.getMaxPlayers()).isEqualTo(4);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.FULL);
    }

    @Test
    void update_maxAboveGameMax_throws() {
        GameSession session = openSession(4, 0);
        session.setBaseGame(game); // game.max = 4
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);

        assertThatThrownBy(() ->
                service.update(10L, new UpdateSessionRequest(null, null, null, null, 6, null)))
                .isInstanceOf(SessionMaxPlayersAboveGameException.class);
    }

    // ---------- CHANGE STATUS ----------

    @Test
    void changeStatus_openToCancelled_succeeds() {
        GameSession session = openSession(4, 1);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(1L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.CANCELLED));

        service.changeStatus(10L, new ChangeStatusRequest(SessionStatus.CANCELLED));

        assertThat(session.getStatus()).isEqualTo(SessionStatus.CANCELLED);
    }

    @Test
    void changeStatus_completedToOpen_throws() {
        GameSession session = openSession(4, 1);
        session.setStatus(SessionStatus.COMPLETED);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);

        assertThatThrownBy(() ->
                service.changeStatus(10L, new ChangeStatusRequest(SessionStatus.OPEN)))
                .isInstanceOf(SessionStatusTransitionException.class);
    }

    @Test
    void changeStatus_byNonOwner_throws() {
        GameSession session = openSession(4, 1);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(999L);

        assertThatThrownBy(() ->
                service.changeStatus(10L, new ChangeStatusRequest(SessionStatus.CANCELLED)))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    @Test
    void changeStatus_idempotent_returnsCurrentDetail() {
        GameSession session = openSession(4, 1);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(1L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        SessionDetailResponse result = service.changeStatus(10L, new ChangeStatusRequest(SessionStatus.OPEN));

        assertThat(result.status()).isEqualTo(SessionStatus.OPEN);
        verify(sessionRepository, times(0)).save(any());
    }

    // ---------- CLOSE ----------

    @Test
    void close_ok_setsMaxToRegisteredAndStatusFull() {
        // registered=2 (creator + 1 other), guests=0 → realThirdParties=1 → OK
        GameSession session = openSession(4, 2);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        given(sessionRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(participantRepository.findBySessionIdOrderByJoinedAtAsc(10L)).willReturn(List.of());
        given(currentUserProvider.getCurrentUserId()).willReturn(Optional.of(1L));
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(10L, SessionStatus.FULL));

        SessionDetailResponse result = service.close(10L);

        assertThat(session.getMaxPlayers()).isEqualTo(2);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.FULL);
        assertThat(result.status()).isEqualTo(SessionStatus.FULL);
        verify(sessionRepository).save(session);
    }

    @Test
    void close_emptyExceptCreator_throws() {
        // registered=1 (creator only), guests=0 → realThirdParties=0 → throws
        GameSession session = openSession(4, 1);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);

        assertThatThrownBy(() -> service.close(10L))
                .isInstanceOf(SessionEmptyCannotCloseException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void close_creatorGuestsDoNotCountAsThirdParty_throws() {
        // registered=3 (creator + 2 guests), guests=2 → realThirdParties=0 → throws
        GameSession session = openSession(4, 3);
        session.setCreatorGuests(2);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);

        assertThatThrownBy(() -> service.close(10L))
                .isInstanceOf(SessionEmptyCannotCloseException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void close_alreadyFull_throws() {
        GameSession session = openSession(4, 4);
        session.setStatus(SessionStatus.FULL);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);

        assertThatThrownBy(() -> service.close(10L))
                .isInstanceOf(SessionStatusTransitionException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void close_notOwner_throws() {
        GameSession session = openSession(4, 2);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(999L); // different user

        assertThatThrownBy(() -> service.close(10L))
                .isInstanceOf(UnauthorizedActionException.class);

        verify(sessionRepository, never()).save(any());
    }

    // ---------- helpers ----------

    private GameSession openSession(int max, int registered) {
        GameSession s = new GameSession();
        s.setId(10L);
        s.setTitle("Catan");
        s.setCreator(creator);
        s.setBaseGame(game);
        s.setCity(city);
        s.setScheduledAt(Instant.now().plus(1, ChronoUnit.DAYS));
        s.setMaxPlayers(max);
        s.setRegisteredPlayers(registered);
        s.setStatus(SessionStatus.OPEN);
        return s;
    }

    private SessionParticipant participant(User u, ParticipantRole role, Integer position) {
        SessionParticipant p = new SessionParticipant();
        p.setUser(u);
        p.setRole(role);
        p.setPosition(position);
        return p;
    }

    private Game expansion(Long bggId, String name, Long baseId) {
        Game g = new Game();
        g.setBggId(bggId);
        g.setName(name);
        g.setExpansion(true);
        g.setBaseGameBggId(baseId);
        return g;
    }

    private SessionDetailResponse detail(Long id, SessionStatus status) {
        return new SessionDetailResponse(id, "t", null, 13L, "Catan", null,
                null,
                List.of(),
                "MAD01", "Madrid", null, null,
                Instant.now(), 4, 0, 0, 0, status,
                1L, "creator", List.of(), null, Instant.now(), Instant.now());
    }

    private User user(Long id, String username) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        return u;
    }
}
