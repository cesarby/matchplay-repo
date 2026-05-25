package com.matchplay.session.service;

import com.matchplay.exception.SessionAlreadyJoinedException;
import com.matchplay.exception.SessionFullException;
import com.matchplay.exception.SessionJoinOwnException;
import com.matchplay.exception.SessionMaxPlayersBelowCurrentException;
import com.matchplay.exception.SessionNotFoundException;
import com.matchplay.exception.SessionScheduledInPastException;
import com.matchplay.exception.SessionStatusTransitionException;
import com.matchplay.exception.UnauthorizedActionException;
import com.matchplay.game.entity.Game;
import com.matchplay.game.exception.BaseGameNotFoundException;
import com.matchplay.game.repository.GameRepository;
import com.matchplay.geo.entity.Area;
import com.matchplay.geo.entity.City;
import com.matchplay.geo.exception.GeoCodeNotFoundException;
import com.matchplay.geo.repository.AreaRepository;
import com.matchplay.geo.repository.CityRepository;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.ChangeStatusRequest;
import com.matchplay.session.dto.CreateSessionRequest;
import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.SessionPlayerResponse;
import com.matchplay.session.dto.SessionSearchCriteria;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.dto.UpdateSessionRequest;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.SessionParticipant;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.GameSessionSpecifications;
import com.matchplay.session.repository.SessionParticipantRepository;
import com.matchplay.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Lógica de negocio del módulo Partidas — Fase 1 (core MVP).
 *
 * <p>Reglas:
 * <ul>
 *   <li>Solo el creador puede actualizar / cambiar estado.</li>
 *   <li>El creador NO puede unirse a su propia partida (ya es organizador).</li>
 *   <li>No se puede crear una partida con scheduledAt en el pasado.</li>
 *   <li>Auto-transición OPEN→FULL al llegar a maxPlayers; FULL→OPEN al salir uno.</li>
 *   <li>Transiciones manuales permitidas:
 *     <ul>
 *       <li>OPEN → FULL (cerrar inscripciones manualmente).</li>
 *       <li>OPEN | FULL → CANCELLED.</li>
 *     </ul>
 *   </li>
 *   <li>Estados terminales (COMPLETED, CANCELLED) no admiten más cambios.</li>
 * </ul></p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GameSessionServiceImpl implements GameSessionService {

    private final GameSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final GameRepository gameRepository;
    private final CityRepository cityRepository;
    private final AreaRepository areaRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SessionMapper mapper;

    /** Transiciones manuales válidas que el creador puede pedir. */
    private static final Map<SessionStatus, Set<SessionStatus>> ALLOWED_TRANSITIONS =
            buildAllowedTransitions();

    private static Map<SessionStatus, Set<SessionStatus>> buildAllowedTransitions() {
        Map<SessionStatus, Set<SessionStatus>> m = new EnumMap<>(SessionStatus.class);
        m.put(SessionStatus.OPEN,        Set.of(SessionStatus.FULL, SessionStatus.CANCELLED));
        m.put(SessionStatus.FULL,        Set.of(SessionStatus.OPEN, SessionStatus.CANCELLED));
        m.put(SessionStatus.IN_PROGRESS, Set.of(SessionStatus.CANCELLED));
        m.put(SessionStatus.COMPLETED,   Set.of()); // terminal
        m.put(SessionStatus.CANCELLED,   Set.of()); // terminal
        return m;
    }

    // ---------- READ ----------

    @Override
    @Transactional(readOnly = true)
    public Page<SessionSummaryResponse> search(SessionSearchCriteria criteria, Pageable pageable) {
        return sessionRepository
                .findAll(GameSessionSpecifications.withCriteria(criteria), pageable)
                .map(mapper::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public SessionDetailResponse findById(Long sessionId) {
        GameSession session = requireSession(sessionId);
        List<SessionParticipant> players = participantRepository
                .findBySessionIdOrderByJoinedAtAsc(sessionId);
        return mapper.toDetail(session, players);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionPlayerResponse> listPlayers(Long sessionId) {
        requireSession(sessionId); // valida existencia
        return participantRepository.findBySessionIdOrderByJoinedAtAsc(sessionId)
                .stream()
                .map(mapper::toPlayer)
                .toList();
    }

    // ---------- WRITE ----------

    @Override
    @Transactional
    public SessionDetailResponse create(CreateSessionRequest request) {
        User creator = currentUserProvider.requireCurrentUser();

        if (request.scheduledAt().isBefore(Instant.now())) {
            throw new SessionScheduledInPastException();
        }

        Game baseGame = gameRepository.findById(request.baseGameId())
                .orElseThrow(() -> new BaseGameNotFoundException(request.baseGameId()));
        City city = cityRepository.findById(request.cityCode())
                .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.city.not.found", request.cityCode()));
        Area area = null;
        if (request.areaCode() != null && !request.areaCode().isBlank()) {
            area = areaRepository.findById(request.areaCode())
                    .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.area.not.found", request.areaCode()));
        }

        GameSession session = new GameSession();
        session.setTitle(request.title());
        session.setDescription(request.description());
        session.setCreator(creator);
        session.setBaseGame(baseGame);
        session.setCity(city);
        session.setArea(area);
        session.setScheduledAt(request.scheduledAt());
        session.setMaxPlayers(request.maxPlayers());
        session.setRegisteredPlayers(0);
        session.setStatus(SessionStatus.OPEN);

        GameSession saved = sessionRepository.save(session);
        log.info("Session created: id={}, creator={}, scheduledAt={}", saved.getId(), creator.getId(), saved.getScheduledAt());
        return mapper.toDetail(saved, List.of());
    }

    @Override
    @Transactional
    public SessionDetailResponse update(Long sessionId, UpdateSessionRequest request) {
        GameSession session = requireSession(sessionId);
        assertOwner(session);
        assertNotTerminal(session.getStatus());

        if (request.title() != null) session.setTitle(request.title());
        if (request.description() != null) session.setDescription(request.description());
        if (request.scheduledAt() != null) {
            if (request.scheduledAt().isBefore(Instant.now())) {
                throw new SessionScheduledInPastException();
            }
            session.setScheduledAt(request.scheduledAt());
        }
        if (request.maxPlayers() != null) {
            if (request.maxPlayers() < session.getRegisteredPlayers()) {
                throw new SessionMaxPlayersBelowCurrentException(
                        request.maxPlayers(), session.getRegisteredPlayers());
            }
            session.setMaxPlayers(request.maxPlayers());
            // si reducimos máximo y ya estaba FULL, vuelve a OPEN solo si queda hueco
            if (session.getStatus() == SessionStatus.FULL
                    && session.getRegisteredPlayers() < session.getMaxPlayers()) {
                session.setStatus(SessionStatus.OPEN);
            }
            // si subimos máximo y está OPEN igual ya no se llena
            if (session.getStatus() == SessionStatus.OPEN
                    && session.getRegisteredPlayers() >= session.getMaxPlayers()) {
                session.setStatus(SessionStatus.FULL);
            }
        }
        if (request.areaCode() != null) {
            if (request.areaCode().isBlank()) {
                session.setArea(null);
            } else {
                Area area = areaRepository.findById(request.areaCode())
                        .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.area.not.found", request.areaCode()));
                session.setArea(area);
            }
        }

        GameSession saved = sessionRepository.save(session);
        List<SessionParticipant> players = participantRepository.findBySessionIdOrderByJoinedAtAsc(sessionId);
        log.info("Session updated: id={}", saved.getId());
        return mapper.toDetail(saved, players);
    }

    @Override
    @Transactional
    public SessionDetailResponse changeStatus(Long sessionId, ChangeStatusRequest request) {
        GameSession session = requireSession(sessionId);
        assertOwner(session);

        SessionStatus current = session.getStatus();
        SessionStatus target = request.status();

        if (current == target) {
            // idempotente — no falla, devuelve el detalle actual
            List<SessionParticipant> players = participantRepository.findBySessionIdOrderByJoinedAtAsc(sessionId);
            return mapper.toDetail(session, players);
        }
        Set<SessionStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(target)) {
            throw new SessionStatusTransitionException(current.name(), target.name());
        }

        session.setStatus(target);
        sessionRepository.save(session);
        List<SessionParticipant> players = participantRepository.findBySessionIdOrderByJoinedAtAsc(sessionId);
        log.info("Session status changed: id={} {} → {}", sessionId, current, target);
        return mapper.toDetail(session, players);
    }

    @Override
    @Transactional
    public SessionDetailResponse join(Long sessionId) {
        User user = currentUserProvider.requireCurrentUser();
        GameSession session = requireSession(sessionId);

        if (session.getCreator().getId().equals(user.getId())) {
            throw new SessionJoinOwnException();
        }
        if (session.getStatus() != SessionStatus.OPEN) {
            // si está FULL, CANCELLED, IN_PROGRESS o COMPLETED, no se puede entrar
            if (session.getStatus() == SessionStatus.FULL) {
                throw new SessionFullException();
            }
            throw new SessionStatusTransitionException(session.getStatus().name(), "JOIN");
        }
        if (participantRepository.existsBySessionIdAndUserId(sessionId, user.getId())) {
            throw new SessionAlreadyJoinedException();
        }
        if (session.getRegisteredPlayers() >= session.getMaxPlayers()) {
            throw new SessionFullException();
        }

        SessionParticipant participant = new SessionParticipant(session, user);
        participantRepository.save(participant);

        session.setRegisteredPlayers(session.getRegisteredPlayers() + 1);
        if (session.getRegisteredPlayers() >= session.getMaxPlayers()) {
            session.setStatus(SessionStatus.FULL);
        }
        sessionRepository.save(session);
        log.info("User {} joined session {}", user.getId(), sessionId);

        List<SessionParticipant> players = participantRepository.findBySessionIdOrderByJoinedAtAsc(sessionId);
        return mapper.toDetail(session, players);
    }

    @Override
    @Transactional
    public SessionDetailResponse leave(Long sessionId) {
        User user = currentUserProvider.requireCurrentUser();
        GameSession session = requireSession(sessionId);

        long removed = participantRepository.deleteBySessionIdAndUserId(sessionId, user.getId());
        if (removed == 0) {
            // el usuario no estaba apuntado — devolvemos 403 vía UnauthorizedAction
            throw new UnauthorizedActionException("error.session.not.participant");
        }

        session.setRegisteredPlayers(Math.max(0, session.getRegisteredPlayers() - 1));
        if (session.getStatus() == SessionStatus.FULL
                && session.getRegisteredPlayers() < session.getMaxPlayers()) {
            session.setStatus(SessionStatus.OPEN);
        }
        sessionRepository.save(session);
        log.info("User {} left session {}", user.getId(), sessionId);

        List<SessionParticipant> players = participantRepository.findBySessionIdOrderByJoinedAtAsc(sessionId);
        return mapper.toDetail(session, players);
    }

    // ---------- helpers ----------

    private GameSession requireSession(Long sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));
    }

    private void assertOwner(GameSession session) {
        Long current = currentUserProvider.requireCurrentUserId();
        if (!session.getCreator().getId().equals(current)) {
            throw new UnauthorizedActionException("error.session.not.owner");
        }
    }

    private void assertNotTerminal(SessionStatus status) {
        if (status == SessionStatus.COMPLETED || status == SessionStatus.CANCELLED) {
            throw new SessionStatusTransitionException(status.name(), "UPDATE");
        }
    }
}
