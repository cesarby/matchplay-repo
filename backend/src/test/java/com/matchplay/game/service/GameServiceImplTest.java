package com.matchplay.game.service;

import com.matchplay.game.client.BggClient;
import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.entity.Game;
import com.matchplay.game.exception.BaseGameNotFoundException;
import com.matchplay.game.mapper.BggGameMapper;
import com.matchplay.game.repository.GameRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Tests del cache lazy-load de juegos.
 */
@ExtendWith(MockitoExtension.class)
class GameServiceImplTest {

    @Mock GameRepository gameRepository;
    @Mock BggClient bggClient;
    @Mock BggGameMapper bggGameMapper;

    @InjectMocks GameServiceImpl service;

    @Test
    void findOrFetch_whenCachedLocally_returnsWithoutHittingBgg() {
        Game cached = new Game();
        cached.setBggId(13L);
        cached.setName("Catan");
        given(gameRepository.findById(13L)).willReturn(Optional.of(cached));

        Game result = service.findOrFetch(13L);

        assertThat(result).isSameAs(cached);
        verify(bggClient, never()).getThing(any(Long.class));
        verify(gameRepository, never()).save(any());
    }

    @Test
    void findOrFetch_whenNotCached_fetchesFromBggAndPersists() {
        given(gameRepository.findById(13L)).willReturn(Optional.empty());
        BggThingResult.Item item = new BggThingResult.Item(
                13L, "boardgame", null, null, null,
                null, null, null, null, null, null, null);
        given(bggClient.getThing(13L)).willReturn(Optional.of(item));

        Game mapped = new Game();
        mapped.setBggId(13L);
        mapped.setName("Catan");
        given(bggGameMapper.toEntity(item)).willReturn(mapped);
        given(gameRepository.save(mapped)).willReturn(mapped);

        Game result = service.findOrFetch(13L);

        assertThat(result.getBggId()).isEqualTo(13L);
        verify(gameRepository).save(mapped);
    }

    @Test
    void findOrFetch_whenBggDoesNotKnowId_throws() {
        given(gameRepository.findById(99L)).willReturn(Optional.empty());
        given(bggClient.getThing(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.findOrFetch(99L))
                .isInstanceOf(BaseGameNotFoundException.class);

        verify(gameRepository, never()).save(any());
    }

    @Test
    void findOrFetch_withNullId_throws() {
        assertThatThrownBy(() -> service.findOrFetch(null))
                .isInstanceOf(BaseGameNotFoundException.class);
    }
}
