package com.matchplay.geo.repository;

import com.matchplay.geo.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AreaRepository extends JpaRepository<Area, String> {

    List<Area> findByCity_CodeOrderByNameAsc(String cityCode);
}
