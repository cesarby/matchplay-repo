package com.matchplay.session.service;

import com.matchplay.exception.SessionAlreadyJoinedException;
import com.matchplay.exception.SessionJoinOwnException;
import com.matchplay.exception.SessionMaxPlayersAboveGameException;
import com.matchplay.exception.SessionMaxPlayersBelowGameMinException;
import com.matchplay.exception.SessionNotFoundException;
import com.matchplay.exception.SessionScheduledInPastException;
import com.matchplay.exception.SessionStatusTransitionException;
import com.matchplay.exception.UnauthorizedActionException;
import com.matchplay.game.entity.Game;
import com.matchplay.game.repository.GameRepository;
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
    @Mock GameRepository gameRepository;
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
    void create_withFutureDate_persistsAndReturnsDetail() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, "MAD01", null, future, 4);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameRepository.findById(13L)).willReturn(Optional.of(game));
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
    }

    @Test
    void create_withPastDate_throws() {
        Instant past = Instant.now().minus(1, ChronoUnit.HOURS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, "MAD01", null, past, 4);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionScheduledInPastException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void create_maxAboveGameMax_throws() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, "MAD01", null, future, 6); // game.max = 4

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameRepository.findById(13L)).willReturn(Optional.of(game));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionMaxPlayersAboveGameException.class);

        verify(sessionRepository, never()).save(any());
    }

    @Test
    void create_maxBelowGameMin_throws() {
        Instant future = Instant.now().plus(1, ChronoUnit.DAYS);
        CreateSessionRequest req = new CreateSessionRequest(
                "Catan Night", "Desc", 13L, "MAD01", null, future, 2); // game.min = 3

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameRepository.findById(13L)).willReturn(Optional.of(game));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(SessionMaxPlayersBelowGameMinException.class);
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
                "Pandemic", "Desc", 50L, "MAD01", null, future, 10);

        given(currentUserProvider.requireCurrentUser()).willReturn(creator);
        given(gameRepository.findById(50L)).willReturn(Optional.of(cooperative));
        given(cityRepository.findById("MAD01")).willReturn(Optional.of(city));
        given(sessionRepository.save(any())).willAnswer(inv -> {
            GameSession s = inv.getArgument(0);
            s.setId(7L);
            return s;
        });
        given(mapper.toDetail(any(), any(), any())).willReturn(detail(7L, SessionStatus.OPEN));

        service.create(req); // no debe lanzar
    }

    // ---------- FIND ----------

    @Test
    void findById_whenMissing_throws() {
        given(sessionRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(SessionNotFoundException.class);
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

        service.update(10L, new UpdateSessionRequest(null, null, null, null, 4));

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
                service.update(10L, new UpdateSessionRequest(null, null, null, null, 6)))
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

    private SessionDetailResponse detail(Long id, SessionStatus status) {
        return new SessionDetailResponse(id, "t", null, 13L, "Catan",
                "MAD01", "Madrid", null, null,
                Instant.now(), 4, 0, 0, status,
                1L, "creator", List.of(), null, Instant.now(), Instant.now());
    }

    private User user(Long id, String username) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setName(username);
        return u;
    }
}
