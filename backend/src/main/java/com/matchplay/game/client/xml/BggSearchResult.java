package com.matchplay.game.client.xml;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;

import java.util.List;

@JacksonXmlRootElement(localName = "items")
public record BggSearchResult(
        @JsonProperty("total") @JacksonXmlProperty(isAttribute = true) Integer total,

        @JsonProperty("item")
        @JacksonXmlElementWrapper(useWrapping = false)
        List<Item> items
) {

    public record Item(
            @JsonProperty("id") @JacksonXmlProperty(isAttribute = true) Long id,
            @JsonProperty("type") @JacksonXmlProperty(isAttribute = true) String type,
            @JsonProperty("name") Name name,
            @JsonProperty("yearpublished") YearPublished yearPublished
    ) {}

    public record Name(
            @JsonProperty("value") @JacksonXmlProperty(isAttribute = true) String value
    ) {}

    public record YearPublished(
            @JsonProperty("value") @JacksonXmlProperty(isAttribute = true) Integer value
    ) {}
}
