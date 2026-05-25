package com.matchplay.game.client;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.xml.MappingJackson2XmlHttpMessageConverter;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(BggProperties.class)
public class BggClientConfig {

    @Bean
    public RestClient bggRestClient(BggProperties props) {
        // XmlMapper privado: NO se expone como bean para evitar que Spring Boot
        // lo use en el MappingJackson2XmlHttpMessageConverter del servidor MVC
        // (que serviría respuestas XML rotas y perdería JSR-310 para LocalDateTime).
        XmlMapper xmlMapper = XmlMapper.builder()
                .defaultUseWrapper(false)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .build();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));

        MappingJackson2XmlHttpMessageConverter xmlConverter =
                new MappingJackson2XmlHttpMessageConverter(xmlMapper);

        return RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .messageConverters(converters -> {
                    converters.removeIf(c -> c instanceof MappingJackson2XmlHttpMessageConverter);
                    converters.add(0, xmlConverter);
                })
                .defaultHeader(HttpHeaders.USER_AGENT, props.userAgent())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + props.token())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_XML_VALUE)
                .build();
    }
}
