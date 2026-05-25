package com.matchplay.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class StartupLogger {

    private static final Logger log = LoggerFactory.getLogger(StartupLogger.class);

    @Value("${server.port:8080}")
    private int serverPort;

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String frontendOrigin;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        log.info("");
        log.info("==============================================");
        log.info("  MATCHPLAY arrancado");
        log.info("----------------------------------------------");
        log.info("  Backend   http://localhost:{}", serverPort);
        log.info("  Swagger   http://localhost:{}/swagger-ui", serverPort);
        log.info("  Frontend  {}", frontendOrigin);
        log.info("==============================================");
        log.info("");
    }
}
