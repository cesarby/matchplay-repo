package com.matchplay.geo.controller;

import com.matchplay.geo.dto.AreaResponse;
import com.matchplay.geo.dto.CityResponse;
import com.matchplay.geo.dto.ProvinceResponse;
import com.matchplay.geo.service.GeoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/v1/geo")
@RequiredArgsConstructor
@Tag(name = "Geo", description = "Catálogo público de provincias, localidades y zonas")
public class GeoController {

    private static final CacheControl ONE_DAY_PUBLIC =
            CacheControl.maxAge(Duration.ofDays(1)).cachePublic();

    private final GeoService geoService;

    @GetMapping("/provinces")
    @Operation(summary = "Lista todas las provincias ordenadas por nombre")
    public ResponseEntity<List<ProvinceResponse>> provinces() {
        return ResponseEntity.ok()
                .cacheControl(ONE_DAY_PUBLIC)
                .body(geoService.listProvinces());
    }

    @GetMapping("/cities")
    @Operation(summary = "Lista las localidades de una provincia")
    public ResponseEntity<List<CityResponse>> cities(@RequestParam String provinceCode) {
        return ResponseEntity.ok()
                .cacheControl(ONE_DAY_PUBLIC)
                .body(geoService.listCitiesByProvince(provinceCode));
    }

    @GetMapping("/areas")
    @Operation(summary = "Lista las zonas de una localidad")
    public ResponseEntity<List<AreaResponse>> areas(@RequestParam String cityCode) {
        return ResponseEntity.ok()
                .cacheControl(ONE_DAY_PUBLIC)
                .body(geoService.listAreasByCity(cityCode));
    }
}
