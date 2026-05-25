package com.matchplay.geo.service;

import com.matchplay.geo.dto.AreaResponse;
import com.matchplay.geo.dto.CityResponse;
import com.matchplay.geo.dto.ProvinceResponse;

import java.util.List;

public interface GeoService {

    List<ProvinceResponse> listProvinces();

    List<CityResponse> listCitiesByProvince(String provinceCode);

    List<AreaResponse> listAreasByCity(String cityCode);
}
