package com.matchplay.session.service;

import com.matchplay.common.dto.PageResponse;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.MySessionsResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.dto.TabCounts;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.matchplay.session.repository.GameSessionSpecifications.creatorIs;
import static com.matchplay.session.repository.GameSessionSpecifications.participantIs;
import static com.matchplay.session.repository.GameSessionSpecifications.statusActive;
import static com.matchplay.session.repository.GameSessionSpecifications.statusTerminal;

@Service
@RequiredArgsConstructor
public class MySessionsServiceImpl implements MySessionsService {

    private final GameSessionRepository sessionRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SessionMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public MySessionsResponse findMine(Tab tab, Pageable pageable) {
        Long userId = currentUserProvider.requireCurrentUserId();

        // PLAYER y WAITLIST excluyen las partidas propias: el creador se registra
        // automáticamente como PLAYER en session_participants (ver GameSessionServiceImpl)
        // pero esas viven en el tab "Creadas". Apuntado = partidas de otros donde estoy.
        Specification<GameSession> spec = switch (tab) {
            case CREATED  -> Specification.where(creatorIs(userId)).and(statusActive());
            case PLAYER   -> Specification.where(participantIs(userId, ParticipantRole.PLAYER))
                    .and(Specification.not(creatorIs(userId)))
                    .and(statusActive());
            case WAITLIST -> Specification.where(participantIs(userId, ParticipantRole.WAITLIST))
                    .and(Specification.not(creatorIs(userId)))
                    .and(statusActive());
            case HISTORY  -> Specification.where(creatorIs(userId)).and(statusTerminal());
        };

        Sort sort = (tab == Tab.HISTORY)
                ? Sort.by("scheduledAt").descending()
                : Sort.by("scheduledAt").ascending();

        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(), sort);

        Page<GameSession> page = sessionRepository.findAll(spec, sortedPageable);

        boolean withExpansionNames = (tab == Tab.HISTORY);
        List<SessionSummaryResponse> items = page.getContent().stream()
                .map(s -> mapper.toSummary(s, 0, withExpansionNames))
                .toList();

        // Reusamos los metadatos de paginación del Page original (totalElements,
        // totalPages, last) pero con el contenido ya mapeado a DTO.
        Page<SessionSummaryResponse> mappedPage = new PageImpl<>(items, sortedPageable, page.getTotalElements());
        PageResponse<SessionSummaryResponse> pageResponse = PageResponse.fromPage(mappedPage);

        TabCounts counts = computeCounts(userId);

        return new MySessionsResponse(pageResponse, counts);
    }

    private TabCounts computeCounts(Long userId) {
        long created  = sessionRepository.count(Specification.where(creatorIs(userId)).and(statusActive()));
        long player   = sessionRepository.count(Specification.where(participantIs(userId, ParticipantRole.PLAYER))
                .and(Specification.not(creatorIs(userId))).and(statusActive()));
        long waitlist = sessionRepository.count(Specification.where(participantIs(userId, ParticipantRole.WAITLIST))
                .and(Specification.not(creatorIs(userId))).and(statusActive()));
        long history  = sessionRepository.count(Specification.where(creatorIs(userId)).and(statusTerminal()));
        return new TabCounts(created, player, waitlist, history);
    }
}
