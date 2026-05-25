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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GameSearchServiceImpl implements GameSearchService {

    private static final int MIN_QUERY_LENGTH = 2;
    private static final int MAX_PAGE_SIZE = 50;
    private static final String EXPANSION_LINK_TYPE = "boardgameexpansion";

    private final BggClient bggClient;
    private final BggGameMapper bggGameMapper;

    @Override
    public PageResponse<GameSearchResponse> search(String query,
                                                   GameSearchType type,
                                                   Long baseGameId,
                                                   int page,
                                                   int size) {
        GameSearchType effectiveType = type == null ? GameSearchType.BASE : type;
        int effectivePage = Math.max(page, 0);
        int effectiveSize = size <= 0 ? 20 : size;
        validatePageSize(effectiveSize);

        return switch (effectiveType) {
            case BASE -> searchBase(query, effectivePage, effectiveSize);
            case EXPANSION -> searchExpansions(baseGameId, effectivePage, effectiveSize);
        };
    }

    private PageResponse<GameSearchResponse> searchBase(String query, int page, int size) {
        String normalized = query == null ? "" : query.trim();
        if (normalized.length() < MIN_QUERY_LENGTH) {
            throw new InvalidGameSearchException("error.games.query.required");
        }

        BggSearchResult searchResult = bggClient.search(normalized, GameSearchType.BASE.getBggType());
        List<Long> allIds = extractIds(searchResult);
        return enrichAndPaginate(allIds, page, size);
    }

    private PageResponse<GameSearchResponse> searchExpansions(Long baseGameId, int page, int size) {
        if (baseGameId == null) {
            throw new InvalidGameSearchException("error.games.baseGameId.required");
        }

        BggThingResult.Item base = bggClient.getThing(baseGameId)
                .orElseThrow(() -> new BaseGameNotFoundException(baseGameId));

        List<Long> expansionIds = base.links() == null ? Collections.emptyList() :
                base.links().stream()
                        .filter(l -> EXPANSION_LINK_TYPE.equals(l.type()) && !Boolean.TRUE.equals(l.inbound()))
                        .map(BggThingResult.Link::id)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList();

        return enrichAndPaginate(expansionIds, page, size);
    }

    private PageResponse<GameSearchResponse> enrichAndPaginate(List<Long> allIds, int page, int size) {
        if (allIds.isEmpty()) {
            return new PageResponse<>(Collections.emptyList(), page, size, 0, 0, true);
        }

        int totalElements = allIds.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int from = Math.min(page * size, totalElements);
        int to = Math.min(from + size, totalElements);
        List<Long> pageIds = allIds.subList(from, to);

        List<BggThingResult.Item> details = bggClient.getThings(pageIds);
        Map<Long, BggThingResult.Item> byId = details.stream()
                .collect(Collectors.toMap(BggThingResult.Item::id, Function.identity(), (a, b) -> a));

        List<GameSearchResponse> content = pageIds.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(bggGameMapper::toResponse)
                .toList();

        boolean last = page + 1 >= totalPages;
        return new PageResponse<>(content, page, size, totalElements, totalPages, last);
    }

    private List<Long> extractIds(BggSearchResult searchResult) {
        if (searchResult == null || searchResult.items() == null) {
            return Collections.emptyList();
        }
        return searchResult.items().stream()
                .map(BggSearchResult.Item::id)
                .filter(Objects::nonNull)
                .distinct()
                .sorted(Comparator.naturalOrder())
                .toList();
    }

    private void validatePageSize(int size) {
        if (size > MAX_PAGE_SIZE) {
            throw new InvalidGameSearchException("error.games.size.max");
        }
    }
}
