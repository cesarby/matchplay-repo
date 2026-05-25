package com.matchplay.session.service;

import com.matchplay.exception.SessionAlreadyJoinedException;
import com.matchplay.exception.SessionFullException;
import com.matchplay.exception.SessionJoinOwnException;
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
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.SessionParticipant;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.SessionParticipantRepository;
import com.matchplay.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.never;

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
    Game game;
    City city;

    @BeforeEach
    void setUp() {
        creator = user(1L, "creator");
        joiner = user(2L, "joiner");
        game = new Game();
        game.setBggId(13L);
        game.setName("Catan");
        city = new City();
        city.setCode("MAD01");
        city.setName("Madrid");
    }

    // ----- CREATE -----

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
        given(mapper.toDetail(any(GameSession.class), any())).willReturn(detail(99L, SessionStatus.OPEN));

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

    // ----- FIND -----

    @Test
    void findById_whenMissing_throws() {
        given(sessionRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(SessionNotFoundException.class);
    }

    // ----- JOIN -----

    @Test
    void join_happyPath_savesParticipantAndIncrementsCount() {
        GameSession session = openSession(2, 0);

        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.existsBySessionIdAndUserId(10L, 2L)).willReturn(false);
        given(mapper.toDetail(any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

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
        given(mapper.toDetail(any(), any())).willReturn(detail(10L, SessionStatus.FULL));

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

    @Test
    void join_fullSession_throws() {
        GameSession session = openSession(2, 0);
        session.setStatus(SessionStatus.FULL);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));

        assertThatThrownBy(() -> service.join(10L))
                .isInstanceOf(SessionFullException.class);
    }

    // ----- LEAVE -----

    @Test
    void leave_happyPath_decrementsAndKeepsOpen() {
        GameSession session = openSession(4, 2);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.deleteBySessionIdAndUserId(10L, 2L)).willReturn(1L);
        given(mapper.toDetail(any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        service.leave(10L);

        assertThat(session.getRegisteredPlayers()).isEqualTo(1);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.OPEN);
    }

    @Test
    void leave_fromFull_transitionsBackToOpen() {
        GameSession session = openSession(2, 2);
        session.setStatus(SessionStatus.FULL);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.deleteBySessionIdAndUserId(10L, 2L)).willReturn(1L);
        given(mapper.toDetail(any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        service.leave(10L);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.OPEN);
    }

    @Test
    void leave_whenNotParticipant_throwsUnauthorized() {
        GameSession session = openSession(4, 1);
        given(currentUserProvider.requireCurrentUser()).willReturn(joiner);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(participantRepository.deleteBySessionIdAndUserId(10L, 2L)).willReturn(0L);

        assertThatThrownBy(() -> service.leave(10L))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    // ----- CHANGE STATUS -----

    @Test
    void changeStatus_openToCancelled_succeeds() {
        GameSession session = openSession(4, 1);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L); // creator
        given(mapper.toDetail(any(), any())).willReturn(detail(10L, SessionStatus.CANCELLED));

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
        given(currentUserProvider.requireCurrentUserId()).willReturn(999L); // not creator

        assertThatThrownBy(() ->
                service.changeStatus(10L, new ChangeStatusRequest(SessionStatus.CANCELLED)))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    @Test
    void changeStatus_idempotent_returnsCurrentDetail() {
        GameSession session = openSession(4, 1);
        given(sessionRepository.findById(10L)).willReturn(Optional.of(session));
        given(currentUserProvider.requireCurrentUserId()).willReturn(1L);
        given(mapper.toDetail(any(), any())).willReturn(detail(10L, SessionStatus.OPEN));

        SessionDetailResponse result = service.changeStatus(10L, new ChangeStatusRequest(SessionStatus.OPEN));

        assertThat(result.status()).isEqualTo(SessionStatus.OPEN);
        verify(sessionRepository, times(0)).save(any()); // no se persiste si no cambia
    }

    // ----- helpers -----

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

    private SessionDetailResponse detail(Long id, SessionStatus status) {
        return new SessionDetailResponse(id, "t", null, 13L, "Catan",
                "MAD01", "Madrid", null, null,
                Instant.now(), 4, 0, status,
                1L, "creator", List.of(), Instant.now(), Instant.now());
    }

    private User user(Long id, String username) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setName(username);
        return u;
    }
}
