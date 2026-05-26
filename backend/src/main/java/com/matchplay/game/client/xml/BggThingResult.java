package com.matchplay.game.client.xml;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;

import java.util.List;

@JacksonXmlRootElement(localName = "items")
public record BggThingResult(
        @JsonProperty("item")
        @JacksonXmlElementWrapper(useWrapping = false)
        List<Item> items
) {

    public record Item(
            @JsonProperty("id") @JacksonXmlProperty(isAttribute = true) Long id,
            @JsonProperty("type") @JacksonXmlProperty(isAttribute = true) String type,
            @JsonProperty("thumbnail") String thumbnail,
            @JsonProperty("image") String image,
            @JsonProperty("description") String description,

            @JsonProperty("name")
            @JacksonXmlElementWrapper(useWrapping = false)
            List<Name> names,

            @JsonProperty("yearpublished") IntValue yearPublished,
            @JsonProperty("minplayers") IntValue minPlayers,
            @JsonProperty("maxplayers") IntValue maxPlayers,
            @JsonProperty("playingtime") IntValue playingTime,
            @JsonProperty("minplaytime") IntValue minPlayTime,
            @JsonProperty("maxplaytime") IntValue maxPlayTime,

            @JsonProperty("link")
            @JacksonXmlElementWrapper(useWrapping = false)
            List<Link> links
    ) {}

    public record Name(
            @JsonProperty("type") @JacksonXmlProperty(isAttribute = true) String type,
            @JsonProperty("value") @JacksonXmlProperty(isAttribute = true) String value
    ) {}

    public record IntValue(
            @JsonProperty("value") @JacksonXmlProperty(isAttribute = true) Integer value
    ) {}

    public record Link(
            @JsonProperty("type") @JacksonXmlProperty(isAttribute = true) String type,
            @JsonProperty("id") @JacksonXmlProperty(isAttribute = true) Long id,
            @JsonProperty("value") @JacksonXmlProperty(isAttribute = true) String value,
            @JsonProperty("inbound") @JacksonXmlProperty(isAttribute = true) Boolean inbound
    ) {}
}
