package com.matchplay.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.xml.MappingJackson2XmlHttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    // jackson-dataformat-xml es necesario para el cliente RestClient de BGG (consumo XML),
    // pero no queremos exponer respuestas XML desde nuestra API: siempre JSON.
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.removeIf(c -> c instanceof MappingJackson2XmlHttpMessageConverter);
    }
}
