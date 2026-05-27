package com.matchplay.session.service;

import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.MySessionsResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MySessionsServiceImplTest {

    @Mock GameSessionRepository sessionRepository;
    @Mock CurrentUserProvider currentUserProvider;
    @Mock SessionMapper mapper;

    @InjectMocks MySessionsServiceImpl service;

    private static final Long USER_ID = 42L;

    private GameSession session(long id) {
        GameSession s = new GameSession();
        s.setId(id);
        s.setTitle("S" + id);
        s.setStatus(SessionStatus.OPEN);
        s.setScheduledAt(Instant.now());
        return s;
    }

    private SessionSummaryResponse summary(long id) {
        return new SessionSummaryResponse(
                id, "S" + id, 13L, "Catan", null, 0,
                "MAD01", "Madrid", null, null,
                Instant.now(), 4, 1, 0,
                SessionStatus.OPEN, USER_ID, "me", null);
    }

    @SuppressWarnings("unchecked")
    @Test
    void findMine_created_usesAscSortAndCreatorActiveFilter() {
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);

        Page<GameSession> page = new PageImpl<>(List.of(session(1L)));
        given(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(page);
        given(sessionRepository.count(any(Specification.class))).willReturn(0L);
        given(mapper.toSummary(any(), eq(0), eq(false))).willReturn(summary(1L));

        service.findMine(MySessionsService.Tab.CREATED, PageRequest.of(0, 20));

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(sessionRepository).findAll(any(Specification.class), pageableCaptor.capture());
        Sort sort = pageableCaptor.getValue().getSort();
        assertThat(sort.getOrderFor("scheduledAt")).isNotNull();
        assertThat(sort.getOrderFor("scheduledAt").isAscending()).isTrue();
    }

    @SuppressWarnings("unchecked")
    @Test
    void findMine_history_usesDescSortAndPopulatesExpansionNames() {
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);

        Page<GameSession> page = new PageImpl<>(List.of(session(1L)));
        given(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(page);
        given(sessionRepository.count(any(Specification.class))).willReturn(0L);
        given(mapper.toSummary(any(), eq(0), eq(true))).willReturn(summary(1L));

        service.findMine(MySessionsService.Tab.HISTORY, PageRequest.of(0, 20));

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(sessionRepository).findAll(any(Specification.class), pageableCaptor.capture());
        Sort sort = pageableCaptor.getValue().getSort();
        assertThat(sort.getOrderFor("scheduledAt")).isNotNull();
        assertThat(sort.getOrderFor("scheduledAt").isDescending()).isTrue();

        verify(mapper).toSummary(any(), eq(0), eq(true));
    }

    @SuppressWarnings("unchecked")
    @Test
    void findMine_returnsAllFourCounts() {
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);

        Page<GameSession> emptyPage = new PageImpl<>(List.of());
        given(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(emptyPage);
        // computeCounts() llama count() 4 veces en este orden:
        // CREATED-active, PLAYER-active, WAITLIST-active, HISTORY-terminal
        given(sessionRepository.count(any(Specification.class)))
                .willReturn(3L, 5L, 1L, 7L);

        MySessionsResponse out = service.findMine(
                MySessionsService.Tab.CREATED, PageRequest.of(0, 20));

        assertThat(out.counts().created()).isEqualTo(3L);
        assertThat(out.counts().player()).isEqualTo(5L);
        assertThat(out.counts().waitlist()).isEqualTo(1L);
        assertThat(out.counts().history()).isEqualTo(7L);
    }

    @SuppressWarnings("unchecked")
    @Test
    void findMine_player_doesNotPopulateExpansionNames() {
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);

        Page<GameSession> page = new PageImpl<>(List.of(session(1L)));
        given(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(page);
        given(sessionRepository.count(any(Specification.class))).willReturn(0L);
        given(mapper.toSummary(any(), eq(0), eq(false))).willReturn(summary(1L));

        service.findMine(MySessionsService.Tab.PLAYER, PageRequest.of(0, 20));

        verify(mapper, never()).toSummary(any(), eq(0), eq(true));
    }
}
