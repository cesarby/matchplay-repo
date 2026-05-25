package com.matchplay.avatar.repository;

import com.matchplay.avatar.entity.Avatar;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvatarRepository extends JpaRepository<Avatar, String> {
}
