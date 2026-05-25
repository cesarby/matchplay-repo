package com.matchplay.avatar.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "avatars")
@Getter
@Setter
@NoArgsConstructor
public class Avatar {

    @Id
    @Column(length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "required_points", nullable = false)
    private int requiredPoints;

    @Column(name = "display_order", nullable = false, unique = true)
    private int displayOrder;

    @Column(nullable = false)
    private boolean active;
}
