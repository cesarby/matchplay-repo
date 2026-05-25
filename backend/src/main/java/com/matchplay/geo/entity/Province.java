package com.matchplay.geo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "provinces")
@Getter
@Setter
@NoArgsConstructor
public class Province {

    @Id
    @Column(length = 2, columnDefinition = "char(2)")
    private String code;

    @Column(nullable = false, length = 100)
    private String name;
}
