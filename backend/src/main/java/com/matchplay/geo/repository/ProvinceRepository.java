package com.matchplay.geo.repository;

import com.matchplay.geo.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProvinceRepository extends JpaRepository<Province, String> {

    List<Province> findAllByOrderByNameAsc();
}
