package com.matchplay.game.client;

import com.matchplay.game.client.xml.BggSearchResult;
import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.exception.BggUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Component
public class BggClientImpl implements BggClient {

    private final RestClient restClient;

    public BggClientImpl(@Qualifier("bggRestClient") RestClient bggRestClient) {
        this.restClient = bggRestClient;
    }

    @Override
    public BggSearchResult search(String query, String bggType) {
        try {
            BggSearchResult result = restClient.get()
                    .uri(uri -> uri.path("/search")
                            .queryParam("query", query)
                            .queryParam("type", bggType)
                            .build())
                    .retrieve()
                    .body(BggSearchResult.class);
            return result != null ? result : new BggSearchResult(0, Collections.emptyList());
        } catch (RestClientException ex) {
            log.error("BGG /search failed: query={}, type={}", query, bggType, ex);
            throw new BggUnavailableException(ex);
        }
    }

    @Override
    public Optional<BggThingResult.Item> getThing(long bggId) {
        List<BggThingResult.Item> items = getThings(List.of(bggId));
        return items.stream().findFirst();
    }

    @Override
    public List<BggThingResult.Item> getThings(List<Long> bggIds) {
        if (bggIds == null || bggIds.isEmpty()) {
            return Collections.emptyList();
        }
        String ids = bggIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        try {
            BggThingResult result = restClient.get()
                    .uri(uri -> uri.path("/thing")
                            .queryParam("id", ids)
                            .queryParam("type", "boardgame,boardgameexpansion")
                            .build())
                    .retrieve()
                    .body(BggThingResult.class);
            if (result == null || result.items() == null) {
                return Collections.emptyList();
            }
            return result.items();
        } catch (RestClientException ex) {
            log.error("BGG /thing failed: ids={}", ids, ex);
            throw new BggUnavailableException(ex);
        }
    }
}
