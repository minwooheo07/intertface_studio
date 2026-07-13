package com.samchully.ifengine.repository;

import com.samchully.ifengine.domain.IfMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IfMappingRepository extends JpaRepository<IfMapping, Long> {
    List<IfMapping> findByIfIdOrderBySortOrder(String ifId);
}
