package com.matchplay.game.mapper;

import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.dto.GameSearchResponse;
import com.matchplay.game.entity.Game;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.util.List;

@Component
public class BggGameMapper {

    private static final String TYPE_PRIMARY = "primary";
    private static final String TYPE_EXPANSION_LINK = "boardgameexpansion";
    private static final String TYPE_BGG_EXPANSION = "boardgameexpansion";

    public GameSearchResponse toResponse(BggThingResult.Item item) {
        boolean isExpansion = TYPE_BGG_EXPANSION.equals(item.type());
        return new GameSearchResponse(
                item.id(),
                primaryName(item.names()),
                value(item.yearPublished()),
                value(item.minPlayers()),
                value(item.maxPlayers()),
                value(item.minPlayTime()),
                value(item.maxPlayTime()),
                item.thumbnail(),
                item.image(),
                isExpansion,
                !isExpansion && hasOutboundExpansionLink(item.links()),
                isExpansion ? baseGameLinkId(item.links()) : null
        );
    }

    /**
     * Construye una entidad {@link Game} lista para persistir desde un Item
     * de BGG. Usado por {@code GameService.findOrFetch} cuando el juego no
     * está cacheado en local.
     */
    public Game toEntity(BggThingResult.Item item) {
        boolean isExpansion = TYPE_BGG_EXPANSION.equals(item.type());
        Game game = new Game();
        game.setBggId(item.id());
        game.setName(primaryName(item.names()));
        game.setYearPublished(value(item.yearPublished()));
        game.setMinPlayers(value(item.minPlayers()));
        game.setMaxPlayers(value(item.maxPlayers()));
        game.setPlayingTime(value(item.playingTime()));
        game.setThumbnailUrl(item.thumbnail());
        game.setImageUrl(item.image());
        game.setExpansion(isExpansion);
        game.setBaseGameBggId(isExpansion ? baseGameLinkId(item.links()) : null);
        game.setDescription(item.description() != null ? HtmlUtils.htmlUnescape(item.description()) : null);
        return game;
    }

    private String primaryName(List<BggThingResult.Name> names) {
        if (names == null || names.isEmpty()) return null;
        return names.stream()
                .filter(n -> TYPE_PRIMARY.equals(n.type()))
                .map(BggThingResult.Name::value)
                .findFirst()
                .orElseGet(() -> names.get(0).value());
    }

    private Integer value(BggThingResult.IntValue v) {
        return v == null ? null : v.value();
    }

    private boolean hasOutboundExpansionLink(List<BggThingResult.Link> links) {
        if (links == null) return false;
        return links.stream().anyMatch(l ->
                TYPE_EXPANSION_LINK.equals(l.type())
                        && !Boolean.TRUE.equals(l.inbound()));
    }

    private Long baseGameLinkId(List<BggThingResult.Link> links) {
        if (links == null) return null;
        return links.stream()
                .filter(l -> TYPE_EXPANSION_LINK.equals(l.type()) && Boolean.TRUE.equals(l.inbound()))
                .map(BggThingResult.Link::id)
                .findFirst()
                .orElse(null);
    }
}
