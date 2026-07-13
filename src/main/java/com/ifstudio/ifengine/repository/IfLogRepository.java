package com.ifstudio.ifengine.repository;

import com.ifstudio.ifengine.domain.IfLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface IfLogRepository extends JpaRepository<IfLog, Long> {

    boolean existsByIfIdAndRecKeyAndStatus(String ifId, String recKey, String status);

    long countByStatusAndCreatedAtAfter(String status, LocalDateTime after);

    List<IfLog> findTop100ByOrderByLogIdDesc();

    List<IfLog> findTop100ByIfIdOrderByLogIdDesc(String ifId);

    List<IfLog> findTop100ByStatusOrderByLogIdDesc(String status);

    Optional<IfLog> findFirstByIfIdOrderByLogIdDesc(String ifId);
}
