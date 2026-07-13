package com.ifstudio.ifengine.repository;

import com.ifstudio.ifengine.domain.CodeMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CodeMapRepository extends JpaRepository<CodeMap, Long> {

    List<CodeMap> findByGroupIdOrderBySortOrder(String groupId);

    Optional<CodeMap> findByGroupIdAndSrcCode(String groupId, String srcCode);

    void deleteByGroupId(String groupId);

    /** 그룹ID 목록 + 그룹별 항목 수 (등록순). */
    @Query("select c.groupId as groupId, count(c) as cnt from CodeMap c group by c.groupId order by min(c.codeMapId)")
    List<GroupCount> countByGroup();

    interface GroupCount {
        String getGroupId();
        long getCnt();
    }
}
