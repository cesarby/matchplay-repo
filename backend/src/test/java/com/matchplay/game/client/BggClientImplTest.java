package com.matchplay.game.client;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.matchplay.game.client.xml.BggSearchResult;
import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.exception.BggUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.xml.MappingJackson2XmlHttpMessageConverter;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class BggClientImplTest {

    private MockRestServiceServer server;
    private BggClientImpl client;

    @BeforeEach
    void setUp() {
        XmlMapper xmlMapper = XmlMapper.builder()
                .defaultUseWrapper(false)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .build();
        MappingJackson2XmlHttpMessageConverter xmlConverter =
                new MappingJackson2XmlHttpMessageConverter(xmlMapper);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://boardgamegeek.com/xmlapi2")
                .messageConverters(converters -> {
                    converters.removeIf(c -> c instanceof MappingJackson2XmlHttpMessageConverter);
                    converters.add(0, xmlConverter);
                });

        server = MockRestServiceServer.bindTo(builder).build();
        client = new BggClientImpl(builder.build());
    }

    @Test
    void search_parsesItemsFromXml() {
        String xml = """
                <?xml version="1.0" encoding="utf-8" standalone="yes" ?>
                <items total="2" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
                    <item type="boardgame" id="13">
                        <name value="Catan"/>
                        <yearpublished value="1995"/>
                    </item>
                    <item type="boardgame" id="822">
                        <name value="Carcassonne"/>
                        <yearpublished value="2000"/>
                    </item>
                </items>
                """;

        server.expect(requestTo(org.hamcrest.Matchers.startsWith(
                        "https://boardgamegeek.com/xmlapi2/search")))
                .andExpect(method(org.springframework.http.HttpMethod.GET))
                .andExpect(queryParam("query", "catan"))
                .andExpect(queryParam("type", "boardgame"))
                .andRespond(withSuccess(xml, MediaType.APPLICATION_XML));

        BggSearchResult result = client.search("catan", "boardgame");

        assertThat(result.items()).hasSize(2);
        assertThat(result.items().get(0).id()).isEqualTo(13L);
        assertThat(result.items().get(0).name().value()).isEqualTo("Catan");
        assertThat(result.items().get(1).id()).isEqualTo(822L);
        server.verify();
    }

    @Test
    void getThing_parsesDetailsAndLinks() {
        String xml = """
                <?xml version="1.0" encoding="utf-8" standalone="yes" ?>
                <items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
                    <item type="boardgame" id="13">
                        <thumbnail>https://cf.geekdo-images.com/thumb/catan.jpg</thumbnail>
                        <image>https://cf.geekdo-images.com/img/catan.jpg</image>
                        <name type="primary" sortindex="1" value="Catan"/>
                        <name type="alternate" sortindex="1" value="Die Siedler von Catan"/>
                        <yearpublished value="1995"/>
                        <minplayers value="3"/>
                        <maxplayers value="4"/>
                        <playingtime value="90"/>
                        <minplaytime value="60"/>
                        <maxplaytime value="120"/>
                        <link type="boardgameexpansion" id="926" value="Catan: Seafarers"/>
                        <link type="boardgamecategory" id="1015" value="Civilization"/>
                    </item>
                </items>
                """;

        server.expect(requestTo(org.hamcrest.Matchers.startsWith(
                        "https://boardgamegeek.com/xmlapi2/thing")))
                .andExpect(queryParam("id", "13"))
                .andRespond(withSuccess(xml, MediaType.APPLICATION_XML));

        Optional<BggThingResult.Item> item = client.getThing(13L);

        assertThat(item).isPresent();
        BggThingResult.Item i = item.get();
        assertThat(i.id()).isEqualTo(13L);
        assertThat(i.type()).isEqualTo("boardgame");
        assertThat(i.thumbnail()).isEqualTo("https://cf.geekdo-images.com/thumb/catan.jpg");
        assertThat(i.image()).isEqualTo("https://cf.geekdo-images.com/img/catan.jpg");
        assertThat(i.names()).hasSize(2);
        assertThat(i.yearPublished().value()).isEqualTo(1995);
        assertThat(i.minPlayers().value()).isEqualTo(3);
        assertThat(i.maxPlayers().value()).isEqualTo(4);
        assertThat(i.playingTime().value()).isEqualTo(90);
        assertThat(i.minPlayTime().value()).isEqualTo(60);
        assertThat(i.maxPlayTime().value()).isEqualTo(120);
        assertThat(i.links()).hasSize(2);
        assertThat(i.links().get(0).type()).isEqualTo("boardgameexpansion");
        assertThat(i.links().get(0).id()).isEqualTo(926L);
    }

    @Test
    void getThings_emptyList_returnsEmptyWithoutHttp() {
        List<BggThingResult.Item> items = client.getThings(List.of());
        assertThat(items).isEmpty();
        server.verify();
    }

    @Test
    void search_serverError_throwsBggUnavailable() {
        server.expect(requestTo(org.hamcrest.Matchers.startsWith(
                        "https://boardgamegeek.com/xmlapi2/search")))
                .andRespond(withServerError());

        assertThatThrownBy(() -> client.search("catan", "boardgame"))
                .isInstanceOf(BggUnavailableException.class);
    }
}
