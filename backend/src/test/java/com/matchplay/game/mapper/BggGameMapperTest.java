package com.matchplay.game.mapper;

import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.dto.GameSearchResponse;
import com.matchplay.game.entity.Game;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BggGameMapperTest {

    private final BggGameMapper mapper = new BggGameMapper();

    @Test
    void toResponse_baseGameWithExpansionLink_marksHasExpansions() {
        BggThingResult.Item item = new BggThingResult.Item(
                13L, "boardgame", "thumb.jpg", "image.jpg", null,
                List.of(
                        new BggThingResult.Name("alternate", "Die Siedler"),
                        new BggThingResult.Name("primary", "Catan")
                ),
                new BggThingResult.IntValue(1995),
                new BggThingResult.IntValue(3),
                new BggThingResult.IntValue(4),
                new BggThingResult.IntValue(90),
                new BggThingResult.IntValue(60),
                new BggThingResult.IntValue(120),
                List.of(new BggThingResult.Link("boardgameexpansion", 50L, "Seafarers", false))
        );

        GameSearchResponse r = mapper.toResponse(item);

        assertThat(r.bggId()).isEqualTo(13L);
        assertThat(r.name()).isEqualTo("Catan");
        assertThat(r.year()).isEqualTo(1995);
        assertThat(r.minPlayers()).isEqualTo(3);
        assertThat(r.maxPlayers()).isEqualTo(4);
        assertThat(r.minPlayTimeMinutes()).isEqualTo(60);
        assertThat(r.maxPlayTimeMinutes()).isEqualTo(120);
        assertThat(r.thumbnailUrl()).isEqualTo("thumb.jpg");
        assertThat(r.imageUrl()).isEqualTo("image.jpg");
        assertThat(r.isExpansion()).isFalse();
        assertThat(r.hasExpansions()).isTrue();
        assertThat(r.baseGameBggId()).isNull();
    }

    @Test
    void toResponse_expansion_pointsToBaseGame() {
        BggThingResult.Item item = new BggThingResult.Item(
                50L, "boardgameexpansion", null, null, null,
                List.of(new BggThingResult.Name("primary", "Catan: Seafarers")),
                null, null, null, null, null, null,
                List.of(new BggThingResult.Link("boardgameexpansion", 13L, "Catan", true))
        );

        GameSearchResponse r = mapper.toResponse(item);

        assertThat(r.isExpansion()).isTrue();
        assertThat(r.hasExpansions()).isFalse();
        assertThat(r.baseGameBggId()).isEqualTo(13L);
    }

    @Test
    void toResponse_baseGameWithoutExpansionLinks_hasExpansionsFalse() {
        BggThingResult.Item item = new BggThingResult.Item(
                99L, "boardgame", null, null, null,
                List.of(new BggThingResult.Name("primary", "Solo Game")),
                null, null, null, null, null, null,
                List.of()
        );

        GameSearchResponse r = mapper.toResponse(item);

        assertThat(r.hasExpansions()).isFalse();
        assertThat(r.isExpansion()).isFalse();
    }

    @Test
    void toEntity_unescapesHtmlEntitiesInDescription() {
        BggThingResult.Item item = new BggThingResult.Item(
                42L, "boardgame", null, null,
                "Build a zoo &#10;&amp; manage animals.",
                List.of(new BggThingResult.Name("primary", "Zoo Game")),
                null, null, null, null, null, null,
                List.of()
        );

        Game out = mapper.toEntity(item);

        assertThat(out.getDescription()).isEqualTo("Build a zoo \n& manage animals.");
    }
}
