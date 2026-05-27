package com.matchplay.session.service;

import com.matchplay.exception.SessionAlreadyJoinedException;
import com.matchplay.exception.SessionEmptyCannotCloseException;
import com.matchplay.exception.SessionExpansionNotExpansionException;
import com.matchplay.exception.SessionExpansionWrongBaseException;
import com.matchplay.exception.SessionGuestsExceedMaxException;
import com.matchplay.exception.SessionJoinOwnException;
import com.matchplay.exception.SessionMaxPlayersAboveGameException;
import com.matchplay.exception.SessionMaxPlayersBelowCurrentException;
import com.matchplay.exception.SessionMaxPlayersBelowGameMinException;
import com.matchplay.exception.SessionNotFoundException;
import com.matchplay.exception.SessionScheduledInPastException;
import com.matchplay.exception.SessionStatusTransitionException;
import com.matchplay.exception.UnauthorizedActionException;
import com.matchplay.game.entity.Game;
import com.matchplay.game.service.GameService;
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
import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.entity.SessionParticipant;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.GameSessionSpecifications;
import com.matchplay.session.repository.SessionMessageRepository;
import com.matchplay.session.repository.SessionParticipantRepository;
import com.matchplay.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Lógica de negocio del módulo Partidas — Fase 1 (core + waitlist + expansiones).
 *
 * <p>Reglas:
 * <ul>
 *   <li>Solo el creador puede actualizar / cambiar estado.</li>
 *   <li>El creador NO puede unirse a su propia partida.</li>
 *   <li>No se puede crear ni reprogramar una partida con scheduledAt pasada.</li>
 *   <li>{@code maxPlayers} se valida contra {@code Game.minPlayers/maxPlayers}
 *       de BGG (si están informados). Si BGG no da el dato, se salta.</li>
 *   <li>Auto-transition OPEN→FULL al llegar a maxPlayers; FULL→OPEN al
 *       salir un PLAYER y promocionar (o no quedar nadie en la cola).</li>
 *   <li>Waitlist: al unirse a una partida llena se entra como WAITLIST.
 *       Al salir un PLAYER, se promociona FIFO el primer WAITLIST.</li>
 *   <li>Juegos: lazy-load via {@link GameService#findOrFetch} para que el
 *       cliente solo necesite mandar {@code bggId}.</li>
 *   <li>Expansiones: cada {@code expansionBggId} debe (1) resolverse en BGG,
 *       (2) tener {@code isExpansion=true} y (3) pertenecer al juego base.
 *       Duplicados se ignoran silenciosamente. Máximo 20 por partida (en DTO).</li>
 * </ul></p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GameSessionServiceImpl implements GameSessionService {

    private final GameSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final SessionMessageRepository messageRepository;
    private final GameService gameService;
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
        m.put(SessionStatus.IN_PROGRESS, Set.of(SessionStatus.COMPLETED, SessionStatus.CANCELLED));
        m.put(SessionStatus.COMPLETED,   Set.of());
        m.put(SessionStatus.CANCELLED,   Set.of());
        return m;
    }

    // ---------- READ ----------

    @Override
    @Transactional(readOnly = true)
    public Page<SessionSummaryResponse> search(SessionSearchCriteria criteria, Pageable pageable) {
        return sessionRepository
                .findAll(GameSessionSpecifications.withCriteria(criteria), pageable)
                .map(s -> {
                    int wl = (int) participantRepository
                            .countBySessionIdAndRole(s.getId(), ParticipantRole.WAITLIST);
                    return mapper.toSummary(s, wl);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public SessionDetailResponse findById(Long sessionId) {
        GameSession session = requireSession(sessionId);
        return buildDetail(session);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionPlayerResponse> listPlayers(Long sessionId) {
        requireSession(sessionId);
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

        Game baseGame = gameService.findOrFetch(request.baseGameId());
        validateAgainstGameLimits(request.maxPlayers(), baseGame);

        int guests = request.creatorGuests() != null ? request.creatorGuests() : 0;
        // Regla de producto: siempre tiene que quedar al menos 1 plaza libre
        // para que otro usuario pueda apuntarse. Si no, la partida nace ya
        // "cerrada" y no tiene sentido publicarla.
        if (1 + guests >= request.maxPlayers()) {
            throw new SessionGuestsExceedMaxException(guests, request.maxPlayers());
        }

        City city = cityRepository.findById(request.cityCode())
                .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.city.not.found", request.cityCode()));
        Area area = null;
        if (request.areaCode() != null && !request.areaCode().isBlank()) {
            area = areaRepository.findById(request.areaCode())
                    .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.area.not.found", request.areaCode()));
        }

        List<Game> expansions = resolveAndValidateExpansions(request.expansionBggIds(), baseGame);

        GameSession session = new GameSession();
        session.setTitle(request.title());
        session.setDescription(request.description());
        session.setCreator(creator);
        session.setBaseGame(baseGame);
        session.setExpansions(new ArrayList<>(expansions));
        session.setCity(city);
        session.setArea(area);
        session.setScheduledAt(request.scheduledAt());
        session.setMaxPlayers(request.maxPlayers());
        session.setCreatorGuests(guests);
        // El creador + sus acompañantes ocupan plazas desde el minuto cero.
        // La validación de arriba garantiza que siempre queda ≥1 plaza libre,
        // así que el estado inicial es siempre OPEN.
        session.setRegisteredPlayers(1 + guests);
        session.setStatus(SessionStatus.OPEN);

        GameSession saved = sessionRepository.save(session);

        // El creador queda automáticamente apuntado como PLAYER en su propia
        // partida (regla de producto: organizar es jugar). Esto evita el caso
        // "0/3 plazas" justo después de crear y reserva la plaza visualmente.
        // La validación en {@code join} ({@code SessionJoinOwnException}) sigue
        // protegiendo de re-joins.
        SessionParticipant creatorParticipant = new SessionParticipant(saved, creator);
        participantRepository.save(creatorParticipant);

        log.info("Session created: id={}, creator={} (auto-PLAYER), scheduledAt={}, expansions={}",
                saved.getId(), creator.getId(), saved.getScheduledAt(), expansions.size());
        return mapper.toDetail(saved, List.of(creatorParticipant), ParticipantRole.PLAYER, null, null);
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
            int newMax = request.maxPlayers();
            int current = session.getRegisteredPlayers();
            if (newMax < current) {
                throw new SessionMaxPlayersBelowCurrentException(newMax, current);
            }
            validateAgainstGameLimits(newMax, session.getBaseGame());

            session.setMaxPlayers(newMax);
            // Si subimos el tope, promocionamos hasta llenar o agotar cola
            if (newMax > current) {
                promoteWaitlistUntilFull(session);
            }
            recalcStatusAfterCapacityChange(session);
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
        if (request.expansionBggIds() != null) {
            // PATCH semantics sobre el sub-recurso: lista no null = reemplazar.
            List<Game> resolved = resolveAndValidateExpansions(request.expansionBggIds(), session.getBaseGame());
            session.getExpansions().clear();
            session.getExpansions().addAll(resolved);
        }

        GameSession saved = sessionRepository.save(session);
        log.info("Session updated: id={}", saved.getId());
        return buildDetail(saved);
    }

    @Override
    @Transactional
    public SessionDetailResponse changeStatus(Long sessionId, ChangeStatusRequest request) {
        GameSession session = requireSession(sessionId);
        assertOwner(session);

        SessionStatus current = session.getStatus();
        SessionStatus target = request.status();

        if (current == target) {
            return buildDetail(session);
        }
        Set<SessionStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(target)) {
            throw new SessionStatusTransitionException(current.name(), target.name());
        }

        session.setStatus(target);
        if (target == SessionStatus.COMPLETED || target == SessionStatus.CANCELLED) {
            int removed = messageRepository.deleteBySessionId(sessionId);
            if (removed > 0) {
                log.info("Deleted {} chat messages on status change to {}", removed, target);
            }
        }
        sessionRepository.save(session);
        log.info("Session status changed: id={} {} → {}", sessionId, current, target);
        return buildDetail(session);
    }

    @Override
    @Transactional
    public SessionDetailResponse join(Long sessionId) {
        User user = currentUserProvider.requireCurrentUser();
        GameSession session = requireSession(sessionId);

        if (session.getCreator().getId().equals(user.getId())) {
            throw new SessionJoinOwnException();
        }
        if (session.getStatus() == SessionStatus.CANCELLED
                || session.getStatus() == SessionStatus.COMPLETED
                || session.getStatus() == SessionStatus.IN_PROGRESS) {
            throw new SessionStatusTransitionException(session.getStatus().name(), "JOIN");
        }
        if (participantRepository.existsBySessionIdAndUserId(sessionId, user.getId())) {
            throw new SessionAlreadyJoinedException();
        }

        if (session.getRegisteredPlayers() < session.getMaxPlayers()) {
            // hay plaza confirmada
            SessionParticipant participant = new SessionParticipant(session, user);
            participantRepository.save(participant);
            session.setRegisteredPlayers(session.getRegisteredPlayers() + 1);
            if (session.getRegisteredPlayers() >= session.getMaxPlayers()) {
                session.setStatus(SessionStatus.FULL);
            }
            sessionRepository.save(session);
            log.info("User {} joined session {} as PLAYER", user.getId(), sessionId);
        } else {
            // partida llena → waitlist sin límite (FIFO por position)
            int nextPosition = participantRepository
                    .findMaxPositionBySessionIdAndRole(sessionId, ParticipantRole.WAITLIST) + 1;
            SessionParticipant waitlist = new SessionParticipant(session, user, nextPosition);
            participantRepository.save(waitlist);
            log.info("User {} added to waitlist of session {} at position {}", user.getId(), sessionId, nextPosition);
        }

        return buildDetail(session);
    }

    @Override
    @Transactional
    public SessionDetailResponse close(Long sessionId) {
        GameSession session = requireSession(sessionId);
        assertOwner(session);
        if (session.getStatus() != SessionStatus.OPEN) {
            throw new SessionStatusTransitionException(session.getStatus().name(), "CLOSE");
        }
        int realThirdParties = session.getRegisteredPlayers() - 1 - session.getCreatorGuests();
        if (realThirdParties < 1) {
            throw new SessionEmptyCannotCloseException();
        }
        session.setMaxPlayers(session.getRegisteredPlayers());
        session.setStatus(SessionStatus.FULL);
        sessionRepository.save(session);
        log.info("Session closed: id={} max set to {} (FULL)", sessionId, session.getMaxPlayers());
        return buildDetail(session);
    }

    @Override
    @Transactional
    public SessionDetailResponse leave(Long sessionId) {
        User user = currentUserProvider.requireCurrentUser();
        GameSession session = requireSession(sessionId);

        // El creador no puede "salirse" de su propia partida — para irse debe
        // cancelarla vía PATCH /status (regla simétrica a SessionJoinOwnException).
        if (session.getCreator().getId().equals(user.getId())) {
            throw new UnauthorizedActionException("error.session.creator.cannot.leave");
        }

        Optional<SessionParticipant> mine = participantRepository
                .findBySessionIdAndUserId(sessionId, user.getId());
        if (mine.isEmpty()) {
            throw new UnauthorizedActionException("error.session.not.participant");
        }

        SessionParticipant participant = mine.get();
        ParticipantRole leavingRole = participant.getRole();
        participantRepository.delete(participant);

        if (leavingRole == ParticipantRole.PLAYER) {
            session.setRegisteredPlayers(Math.max(0, session.getRegisteredPlayers() - 1));
            // promocionar primero de la cola, si hay
            promoteFirstWaitlist(session);
            recalcStatusAfterCapacityChange(session);
            sessionRepository.save(session);
        }
        log.info("User {} left session {} (was {})", user.getId(), sessionId, leavingRole);
        return buildDetail(session);
    }

    // ---------- helpers ----------

    private SessionDetailResponse buildDetail(GameSession session) {
        List<SessionParticipant> participants = participantRepository
                .findBySessionIdOrderByJoinedAtAsc(session.getId());

        Optional<Long> currentUserIdOpt = currentUserProvider.getCurrentUserId();
        ParticipantRole yourRole = currentUserIdOpt
                .flatMap(uid -> participants.stream()
                        .filter(p -> p.getUser().getId().equals(uid))
                        .findFirst()
                        .map(SessionParticipant::getRole))
                .orElse(null);

        Integer chatUnreadCount = computeChatUnreadCount(session, participants, currentUserIdOpt);
        Integer chatMessageCount = computeChatMessageCount(session);

        return mapper.toDetail(session, participants, yourRole, chatUnreadCount, chatMessageCount);
    }

    /**
     * Devuelve null si el caller es anónimo o no participa (ni creador ni participante).
     * Devuelve 0 si está al día o el chat está cerrado. Devuelve N>0 si hay mensajes
     * posteriores a su {@code lastChatReadAt} que no son del propio caller.
     */
    private Integer computeChatUnreadCount(GameSession session,
                                           List<SessionParticipant> participants,
                                           Optional<Long> currentUserIdOpt) {
        if (currentUserIdOpt.isEmpty()) return null;
        Long uid = currentUserIdOpt.get();

        boolean isCreator = session.getCreator().getId().equals(uid);
        Optional<SessionParticipant> myParticipant = participants.stream()
                .filter(p -> p.getUser().getId().equals(uid))
                .findFirst();
        if (!isCreator && myParticipant.isEmpty()) return null;

        if (session.getStatus() == SessionStatus.COMPLETED
                || session.getStatus() == SessionStatus.CANCELLED) {
            return 0;
        }

        // El creador no tiene fila en session_participants para trackear lastReadAt.
        // Sin tracking, el unread count nunca bajaría porque markRead es no-op para él.
        // Para MVP: creador = siempre al día = 0. Si necesitamos badge real para
        // creador en el futuro, hay que persistir lastReadAt en otro sitio.
        if (isCreator) return 0;

        Instant since = myParticipant.map(SessionParticipant::getLastChatReadAt).orElse(null);
        if (since == null) {
            // Nunca lo abrió: usar epoch para contar TODOS los mensajes ajenos.
            since = Instant.EPOCH;
        }
        long count = messageRepository.countUnread(session.getId(), uid, since);
        return (int) count;
    }

    /**
     * Total de mensajes en el chat de la sesión, visible para CUALQUIER visitante
     * (incluso anónimo). Devuelve null si la sesión es terminal — los mensajes
     * ya fueron borrados y el bloque del chat no aplica.
     */
    private Integer computeChatMessageCount(GameSession session) {
        if (session.getStatus() == SessionStatus.COMPLETED
                || session.getStatus() == SessionStatus.CANCELLED) {
            return null;
        }
        return (int) messageRepository.countBySessionId(session.getId());
    }

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

    /**
     * Valida que {@code maxPlayers} cabe en los límites del juego BGG.
     * Si BGG no aporta minPlayers/maxPlayers, no se valida ese lado.
     */
    private void validateAgainstGameLimits(int requestedMax, Game game) {
        if (game.getMaxPlayers() != null && requestedMax > game.getMaxPlayers()) {
            throw new SessionMaxPlayersAboveGameException(requestedMax, game.getMaxPlayers());
        }
        if (game.getMinPlayers() != null && requestedMax < game.getMinPlayers()) {
            throw new SessionMaxPlayersBelowGameMinException(requestedMax, game.getMinPlayers());
        }
    }

    /**
     * Resuelve cada {@code bggId} de expansión a entidad {@link Game}
     * (cache local o fetch BGG) y aplica las reglas:
     * <ol>
     *   <li>la fila debe tener {@code isExpansion = true} → {@link SessionExpansionNotExpansionException};</li>
     *   <li>su {@code baseGameBggId} debe coincidir con el {@code bggId} del juego base de la partida
     *       → {@link SessionExpansionWrongBaseException}.</li>
     * </ol>
     * Duplicados se ignoran preservando el orden (LinkedHashSet).
     *
     * @return lista de expansiones validadas en el orden recibido (sin duplicados); vacía si {@code bggIds} es null o vacía.
     */
    private List<Game> resolveAndValidateExpansions(List<Long> bggIds, Game baseGame) {
        if (bggIds == null || bggIds.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> deduped = new LinkedHashSet<>(bggIds);
        List<Game> resolved = new ArrayList<>(deduped.size());
        for (Long expBggId : deduped) {
            Game expansion = gameService.findOrFetch(expBggId);
            if (!expansion.isExpansion()) {
                throw new SessionExpansionNotExpansionException(expBggId);
            }
            if (expansion.getBaseGameBggId() == null
                    || !expansion.getBaseGameBggId().equals(baseGame.getBggId())) {
                throw new SessionExpansionWrongBaseException(expBggId, baseGame.getBggId());
            }
            resolved.add(expansion);
        }
        return resolved;
    }

    /**
     * Promociona el primer WAITLIST a PLAYER (si lo hay) e incrementa
     * {@code registeredPlayers}. No persiste la sesión — el llamador lo hace.
     */
    private boolean promoteFirstWaitlist(GameSession session) {
        if (session.getRegisteredPlayers() >= session.getMaxPlayers()) return false;
        Optional<SessionParticipant> first = participantRepository
                .findFirstBySessionIdAndRoleOrderByPositionAsc(session.getId(), ParticipantRole.WAITLIST);
        if (first.isEmpty()) return false;

        SessionParticipant p = first.get();
        p.setRole(ParticipantRole.PLAYER);
        p.setPosition(null);
        p.setPromotedAt(Instant.now());
        participantRepository.save(p);

        session.setRegisteredPlayers(session.getRegisteredPlayers() + 1);
        log.info("Promoted user {} from waitlist to PLAYER in session {}", p.getUser().getId(), session.getId());
        return true;
    }

    /**
     * Llama a {@link #promoteFirstWaitlist} en bucle hasta llenar o vaciar cola.
     */
    private void promoteWaitlistUntilFull(GameSession session) {
        while (promoteFirstWaitlist(session)) {
            // promueve uno por iteración hasta que no haya más o se llene
        }
    }

    /**
     * Tras un cambio de capacidad (leave de PLAYER, update maxPlayers, etc.),
     * sincroniza {@code status} entre OPEN y FULL en función de registrados.
     */
    private void recalcStatusAfterCapacityChange(GameSession session) {
        if (session.getStatus() == SessionStatus.FULL
                && session.getRegisteredPlayers() < session.getMaxPlayers()) {
            session.setStatus(SessionStatus.OPEN);
        } else if (session.getStatus() == SessionStatus.OPEN
                && session.getRegisteredPlayers() >= session.getMaxPlayers()) {
            session.setStatus(SessionStatus.FULL);
        }
    }
}
