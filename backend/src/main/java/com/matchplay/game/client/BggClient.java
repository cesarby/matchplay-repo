package com.matchplay.game.client;

import com.matchplay.game.client.xml.BggSearchResult;
import com.matchplay.game.client.xml.BggThingResult;

import java.util.List;
import java.util.Optional;

public interface BggClient {

    BggSearchResult search(String query, String bggType);

    Optional<BggThingResult.Item> getThing(long bggId);

    List<BggThingResult.Item> getThings(List<Long> bggIds);
}
