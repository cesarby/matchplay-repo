package com.matchplay.geo.repository;

import com.matchplay.geo.entity.City;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CityRepository extends JpaRepository<City, String> {

    List<City> findByProvince_CodeOrderByNameAsc(String provinceCode);
}
