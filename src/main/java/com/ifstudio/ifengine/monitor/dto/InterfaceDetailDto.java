package com.ifstudio.ifengine.monitor.dto;

import com.ifstudio.ifengine.domain.IfMapping;
import com.ifstudio.ifengine.domain.IfMaster;

import java.util.ArrayList;
import java.util.List;

/**
 * 인터페이스 상세 DTO. 편집기의 저장/조회 단위 (마스터 + 매핑 묶음).
 * 프론트 InterfaceDetail 타입과 1:1 대응.
 */
public class InterfaceDetailDto {

    public IfMaster master;
    public List<MappingDto> mappings = new ArrayList<>();

    /** 매핑 DTO (엔티티의 ifId는 서버가 채우므로 제외) */
    public static class MappingDto {
        public Long mappingId;
        public String srcField;
        public String tgtField;
        public String transformRule;
        public Integer sortOrder;
    }

    /** 엔티티 → DTO */
    public static InterfaceDetailDto of(IfMaster master, List<IfMapping> mappings) {
        InterfaceDetailDto dto = new InterfaceDetailDto();
        dto.master = master;
        int i = 1;
        for (IfMapping m : mappings) {
            MappingDto md = new MappingDto();
            md.mappingId = m.getMappingId();
            md.srcField = m.getSrcField();
            md.tgtField = m.getTgtField();
            md.transformRule = m.getTransformRule();
            md.sortOrder = m.getSortOrder() != null ? m.getSortOrder() : i;
            dto.mappings.add(md);
            i++;
        }
        return dto;
    }
}
