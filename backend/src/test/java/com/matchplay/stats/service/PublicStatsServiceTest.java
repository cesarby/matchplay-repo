package com.matchplay.stats.service;

import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.stats.dto.PublicStatsResponse;
import com.matchplay.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class PublicStatsServiceTest {

    @Mock GameSessionRepository sessionRepository;
    @Mock UserRepository userRepository;

    @InjectMocks PublicStatsService service;

    @Test
    void getPublicStats_withEmptyDatabase_returnsZeros() {
        given(sessionRepository.countByStatusAndScheduledAtAfter(eq(SessionStatus.OPEN), any(Instant.class)))
                .willReturn(0L);
        given(userRepository.countByActiveTrueAndDeletedFalse()).willReturn(0L);
        given(userRepository.countDistinctCitiesByActiveTrueAndDeletedFalse()).willReturn(0L);

        PublicStatsResponse response = service.getPublicStats();

        assertThat(response.activeSessions()).isZero();
        assertThat(response.activePlayers()).isZero();
        assertThat(response.cities()).isZero();
    }

    @Test
    void getPublicStats_withData_returnsAggregates() {
        given(sessionRepository.countByStatusAndScheduledAtAfter(eq(SessionStatus.OPEN), any(Instant.class)))
                .willReturn(142L);
        given(userRepository.countByActiveTrueAndDeletedFalse()).willReturn(387L);
        given(userRepository.countDistinctCitiesByActiveTrueAndDeletedFalse()).willReturn(24L);

        PublicStatsResponse response = service.getPublicStats();

        assertThat(response.activeSessions()).isEqualTo(142L);
        assertThat(response.activePlayers()).isEqualTo(387L);
        assertThat(response.cities()).isEqualTo(24L);
    }

    @Test
    void getPublicStats_onlyCountsOpenFutureSessions() {
        given(sessionRepository.countByStatusAndScheduledAtAfter(eq(SessionStatus.OPEN), any(Instant.class)))
                .willReturn(5L);
        given(userRepository.countByActiveTrueAndDeletedFalse()).willReturn(10L);
        given(userRepository.countDistinctCitiesByActiveTrueAndDeletedFalse()).willReturn(2L);

        service.getPublicStats();

        then(sessionRepository).should().countByStatusAndScheduledAtAfter(eq(SessionStatus.OPEN), any(Instant.class));
        then(sessionRepository).shouldHaveNoMoreInteractions();
    }
}
