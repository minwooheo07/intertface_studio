package com.ifstudio.ifengine.repository;

import com.ifstudio.ifengine.domain.IfMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IfMappingRepository extends JpaRepository<IfMapping, Long> {
    List<IfMapping> findByIfIdOrderBySortOrder(String ifId);
}
