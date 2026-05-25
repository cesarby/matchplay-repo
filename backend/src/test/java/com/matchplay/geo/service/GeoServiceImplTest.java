package com.matchplay.geo.service;

import com.matchplay.geo.dto.AreaResponse;
import com.matchplay.geo.dto.CityResponse;
import com.matchplay.geo.dto.ProvinceResponse;
import com.matchplay.geo.entity.Area;
import com.matchplay.geo.entity.City;
import com.matchplay.geo.entity.Province;
import com.matchplay.geo.exception.GeoCodeNotFoundException;
import com.matchplay.geo.mapper.GeoMapper;
import com.matchplay.geo.repository.AreaRepository;
import com.matchplay.geo.repository.CityRepository;
import com.matchplay.geo.repository.ProvinceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GeoServiceImplTest {

    @Mock ProvinceRepository provinceRepository;
    @Mock CityRepository cityRepository;
    @Mock AreaRepository areaRepository;
    @Mock GeoMapper mapper;
    @InjectMocks GeoServiceImpl service;

    @Test
    void listProvinces_returnsAllSortedByName() {
        Province p1 = province("01", "Álava");
        Province p2 = province("08", "Barcelona");
        given(provinceRepository.findAllByOrderByNameAsc()).willReturn(List.of(p1, p2));
        given(mapper.toResponse(p1)).willReturn(new ProvinceResponse("01", "Álava"));
        given(mapper.toResponse(p2)).willReturn(new ProvinceResponse("08", "Barcelona"));

        List<ProvinceResponse> result = service.listProvinces();

        assertThat(result).extracting(ProvinceResponse::code).containsExactly("01", "08");
    }

    @Test
    void listCitiesByProvince_provinceExists_returnsCities() {
        Province p = province("08", "Barcelona");
        City c = city("08019", "Barcelona", p);
        given(provinceRepository.existsById("08")).willReturn(true);
        given(cityRepository.findByProvince_CodeOrderByNameAsc("08")).willReturn(List.of(c));
        given(mapper.toResponse(c)).willReturn(new CityResponse("08019", "Barcelona", "08"));

        List<CityResponse> result = service.listCitiesByProvince("08");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).provinceCode()).isEqualTo("08");
    }

    @Test
    void listCitiesByProvince_provinceNotFound_throws() {
        given(provinceRepository.existsById("99")).willReturn(false);

        assertThatThrownBy(() -> service.listCitiesByProvince("99"))
                .isInstanceOf(GeoCodeNotFoundException.class)
                .hasMessage("error.geo.province.not.found");

        verify(cityRepository, never()).findByProvince_CodeOrderByNameAsc("99");
    }

    @Test
    void listAreasByCity_cityExists_returnsAreas() {
        Province p = province("08", "Barcelona");
        City c = city("08019", "Barcelona", p);
        Area a = area("08019-001", "Eixample", c);
        given(cityRepository.existsById("08019")).willReturn(true);
        given(areaRepository.findByCity_CodeOrderByNameAsc("08019")).willReturn(List.of(a));
        given(mapper.toResponse(a)).willReturn(new AreaResponse("08019-001", "Eixample", "08019"));

        List<AreaResponse> result = service.listAreasByCity("08019");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).cityCode()).isEqualTo("08019");
    }

    @Test
    void listAreasByCity_cityNotFound_throws() {
        given(cityRepository.existsById("99999")).willReturn(false);

        assertThatThrownBy(() -> service.listAreasByCity("99999"))
                .isInstanceOf(GeoCodeNotFoundException.class)
                .hasMessage("error.geo.city.not.found");

        verify(areaRepository, never()).findByCity_CodeOrderByNameAsc("99999");
    }

    private static Province province(String code, String name) {
        Province p = new Province();
        p.setCode(code);
        p.setName(name);
        return p;
    }

    private static City city(String code, String name, Province p) {
        City c = new City();
        c.setCode(code);
        c.setName(name);
        c.setProvince(p);
        return c;
    }

    private static Area area(String code, String name, City c) {
        Area a = new Area();
        a.setCode(code);
        a.setName(name);
        a.setCity(c);
        return a;
    }
}
