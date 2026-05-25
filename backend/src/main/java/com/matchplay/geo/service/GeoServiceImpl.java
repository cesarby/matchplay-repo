package com.matchplay.geo.service;

import com.matchplay.geo.dto.AreaResponse;
import com.matchplay.geo.dto.CityResponse;
import com.matchplay.geo.dto.ProvinceResponse;
import com.matchplay.geo.exception.GeoCodeNotFoundException;
import com.matchplay.geo.mapper.GeoMapper;
import com.matchplay.geo.repository.AreaRepository;
import com.matchplay.geo.repository.CityRepository;
import com.matchplay.geo.repository.ProvinceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GeoServiceImpl implements GeoService {

    private final ProvinceRepository provinceRepository;
    private final CityRepository cityRepository;
    private final AreaRepository areaRepository;
    private final GeoMapper mapper;

    @Override
    public List<ProvinceResponse> listProvinces() {
        return provinceRepository.findAllByOrderByNameAsc().stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Override
    public List<CityResponse> listCitiesByProvince(String provinceCode) {
        if (!provinceRepository.existsById(provinceCode)) {
            throw new GeoCodeNotFoundException("error.geo.province.not.found", provinceCode);
        }
        return cityRepository.findByProvince_CodeOrderByNameAsc(provinceCode).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Override
    public List<AreaResponse> listAreasByCity(String cityCode) {
        if (!cityRepository.existsById(cityCode)) {
            throw new GeoCodeNotFoundException("error.geo.city.not.found", cityCode);
        }
        return areaRepository.findByCity_CodeOrderByNameAsc(cityCode).stream()
                .map(mapper::toResponse)
                .toList();
    }
}
