package com.samchully.ifengine.repository;

import com.samchully.ifengine.domain.IfMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IfMasterRepository extends JpaRepository<IfMaster, String> {
    List<IfMaster> findByUseYn(String useYn);
}
