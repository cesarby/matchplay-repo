package com.matchplay.game.service;

import com.matchplay.game.client.BggClient;
import com.matchplay.game.client.xml.BggSearchResult;
import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.dto.GameSearchResponse;
import com.matchplay.game.dto.GameSearchType;
import com.matchplay.common.dto.PageResponse;
import com.matchplay.game.exception.BaseGameNotFoundException;
import com.matchplay.game.exception.InvalidGameSearchException;
import com.matchplay.game.mapper.BggGameMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class GameSearchServiceImplTest {

    @Mock BggClient bggClient;
    @Mock BggGameMapper bggGameMapper;
    @InjectMocks GameSearchServiceImpl service;

    @Test
    void search_baseWithoutQuery_throwsInvalid() {
        assertThatThrownBy(() -> service.search(null, GameSearchType.BASE, null, 0, 20))
                .isInstanceOf(InvalidGameSearchException.class)
                .hasMessage("error.games.query.required");
        then(bggClient).should(never()).search(anyString(), anyString());
    }

    @Test
    void search_baseWithShortQuery_throwsInvalid() {
        assertThatThrownBy(() -> service.search("a", GameSearchType.BASE, null, 0, 20))
                .isInstanceOf(InvalidGameSearchException.class)
                .hasMessage("error.games.query.required");
    }

    @Test
    void search_expansionWithoutBaseId_throwsInvalid() {
        assertThatThrownBy(() -> service.search(null, GameSearchType.EXPANSION, null, 0, 20))
                .isInstanceOf(InvalidGameSearchException.class)
                .hasMessage("error.games.baseGameId.required");
    }

    @Test
    void search_sizeOverMax_throwsInvalid() {
        assertThatThrownBy(() -> service.search("catan", GameSearchType.BASE, null, 0, 51))
                .isInstanceOf(InvalidGameSearchException.class)
                .hasMessage("error.games.size.max");
    }

    @Test
    void search_baseHappyPath_returnsMappedPage() {
        BggSearchResult searchResult = new BggSearchResult(2, List.of(
                new BggSearchResult.Item(13L, "boardgame",
                        new BggSearchResult.Name("Catan"), new BggSearchResult.YearPublished(1995)),
                new BggSearchResult.Item(42L, "boardgame",
                        new BggSearchResult.Name("Catan: Cities"), new BggSearchResult.YearPublished(1998))
        ));
        BggThingResult.Item catan = item(13L, "boardgame", "Catan");
        BggThingResult.Item cities = item(42L, "boardgame", "Catan: Cities");

        given(bggClient.search("catan", "boardgame")).willReturn(searchResult);
        given(bggClient.getThings(List.of(13L, 42L))).willReturn(List.of(catan, cities));
        given(bggGameMapper.toResponse(catan)).willReturn(response(13L, "Catan"));
        given(bggGameMapper.toResponse(cities)).willReturn(response(42L, "Catan: Cities"));

        PageResponse<GameSearchResponse> result = service.search("catan", GameSearchType.BASE, null, 0, 20);

        assertThat(result.content()).hasSize(2);
        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.totalPages()).isEqualTo(1);
        assertThat(result.last()).isTrue();
        assertThat(result.content().get(0).bggId()).isEqualTo(13L);
    }

    @Test
    void search_baseFiltersOutExpansionsThatBggReturned() {
        // BGG con type=boardgame puede colar expansiones; el service las descarta.
        BggSearchResult searchResult = new BggSearchResult(2, List.of(
                new BggSearchResult.Item(13L, "boardgame",
                        new BggSearchResult.Name("Catan"), new BggSearchResult.YearPublished(1995)),
                new BggSearchResult.Item(50L, "boardgameexpansion",
                        new BggSearchResult.Name("Catan: Seafarers"), new BggSearchResult.YearPublished(1997))
        ));
        BggThingResult.Item catan = item(13L, "boardgame", "Catan");
        BggThingResult.Item seafarers = item(50L, "boardgameexpansion", "Catan: Seafarers");

        given(bggClient.search("catan", "boardgame")).willReturn(searchResult);
        given(bggClient.getThings(List.of(13L, 50L))).willReturn(List.of(catan, seafarers));
        given(bggGameMapper.toResponse(catan)).willReturn(response(13L, "Catan"));
        given(bggGameMapper.toResponse(seafarers)).willReturn(expansionResponse(50L, "Catan: Seafarers"));

        PageResponse<GameSearchResponse> result = service.search("catan", GameSearchType.BASE, null, 0, 20);

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).bggId()).isEqualTo(13L);
        assertThat(result.content().get(0).isExpansion()).isFalse();
    }

    @Test
    void search_expansionsFiltersOutItemsThatArentExpansions() {
        // Defensa doble: si BGG marca mal el tipo de un link, el detalle con
        // isExpansion=false debe descartarse.
        BggThingResult.Item base = baseWithExpansions(13L, List.of(50L, 99L));
        BggThingResult.Item exp50 = item(50L, "boardgameexpansion", "Seafarers");
        BggThingResult.Item bogus = item(99L, "boardgame", "WTF this is a base");

        given(bggClient.getThing(13L)).willReturn(Optional.of(base));
        given(bggClient.getThings(List.of(50L, 99L))).willReturn(List.of(exp50, bogus));
        given(bggGameMapper.toResponse(exp50)).willReturn(expansionResponse(50L, "Seafarers"));
        given(bggGameMapper.toResponse(bogus)).willReturn(response(99L, "WTF this is a base"));

        PageResponse<GameSearchResponse> result = service.search(null, GameSearchType.EXPANSION, 13L, 0, 20);

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).bggId()).isEqualTo(50L);
        assertThat(result.content().get(0).isExpansion()).isTrue();
    }

    @Test
    void search_baseEmptyResults_returnsEmptyPage() {
        given(bggClient.search("nope", "boardgame"))
                .willReturn(new BggSearchResult(0, List.of()));

        PageResponse<GameSearchResponse> result = service.search("nope", GameSearchType.BASE, null, 0, 20);

        assertThat(result.content()).isEmpty();
        assertThat(result.totalElements()).isZero();
        assertThat(result.last()).isTrue();
        then(bggClient).should(never()).getThings(any());
    }

    @Test
    void search_expansionsHappyPath_slicesPageAndEnriches() {
        BggThingResult.Item base = baseWithExpansions(13L, List.of(50L, 51L, 52L));
        BggThingResult.Item exp50 = item(50L, "boardgameexpansion", "Seafarers");
        BggThingResult.Item exp51 = item(51L, "boardgameexpansion", "Cities & Knights");

        given(bggClient.getThing(13L)).willReturn(Optional.of(base));
        given(bggClient.getThings(List.of(50L, 51L))).willReturn(List.of(exp50, exp51));
        // isExpansion=true porque la regla del service descarta los que no lo sean
        given(bggGameMapper.toResponse(exp50)).willReturn(expansionResponse(50L, "Seafarers"));
        given(bggGameMapper.toResponse(exp51)).willReturn(expansionResponse(51L, "Cities & Knights"))
                ;

        PageResponse<GameSearchResponse> result = service.search(null, GameSearchType.EXPANSION, 13L, 0, 2);

        assertThat(result.content()).hasSize(2);
        assertThat(result.totalElements()).isEqualTo(3);
        assertThat(result.totalPages()).isEqualTo(2);
        assertThat(result.last()).isFalse();
        then(bggClient).should(times(1)).getThings(List.of(50L, 51L));
    }

    @Test
    void search_expansionsBaseNotFound_throws() {
        given(bggClient.getThing(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.search(null, GameSearchType.EXPANSION, 999L, 0, 20))
                .isInstanceOf(BaseGameNotFoundException.class)
                .hasMessage("error.games.base.not.found");
    }

    @Test
    void search_nullTypeDefaultsToBase() {
        given(bggClient.search(eq("catan"), eq("boardgame")))
                .willReturn(new BggSearchResult(0, List.of()));

        service.search("catan", null, null, 0, 20);

        then(bggClient).should().search("catan", "boardgame");
    }

    private static BggThingResult.Item item(Long id, String type, String name) {
        return new BggThingResult.Item(
                id, type, null, null, null,
                List.of(new BggThingResult.Name("primary", name)),
                null, null, null, null, null, null,
                List.of()
        );
    }

    private static BggThingResult.Item baseWithExpansions(Long baseId, List<Long> expansionIds) {
        List<BggThingResult.Link> links = expansionIds.stream()
                .map(id -> new BggThingResult.Link("boardgameexpansion", id, "exp-" + id, false))
                .toList();
        return new BggThingResult.Item(
                baseId, "boardgame", null, null, null,
                List.of(new BggThingResult.Name("primary", "base-" + baseId)),
                null, null, null, null, null, null,
                links
        );
    }

    private static GameSearchResponse response(Long id, String name) {
        return new GameSearchResponse(id, name, null, null, null, null, null, null, null, false, false, null);
    }

    private static GameSearchResponse expansionResponse(Long id, String name) {
        // isExpansion=true para satisfacer el filtro de searchExpansions
        return new GameSearchResponse(id, name, null, null, null, null, null, null, null, true, false, null);
    }
}
