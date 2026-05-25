package com.matchplay.geo.mapper;

import com.matchplay.geo.dto.AreaResponse;
import com.matchplay.geo.dto.CityResponse;
import com.matchplay.geo.dto.ProvinceResponse;
import com.matchplay.geo.entity.Area;
import com.matchplay.geo.entity.City;
import com.matchplay.geo.entity.Province;
import org.springframework.stereotype.Component;

@Component
public class GeoMapper {

    public ProvinceResponse toResponse(Province p) {
        return new ProvinceResponse(p.getCode(), p.getName());
    }

    public CityResponse toResponse(City c) {
        return new CityResponse(c.getCode(), c.getName(), c.getProvince().getCode());
    }

    public AreaResponse toResponse(Area a) {
        return new AreaResponse(a.getCode(), a.getName(), a.getCity().getCode());
    }
}
