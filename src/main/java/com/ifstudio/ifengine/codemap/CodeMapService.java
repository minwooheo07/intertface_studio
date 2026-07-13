package com.ifstudio.ifengine.codemap;

import com.ifstudio.ifengine.domain.CodeMap;
import com.ifstudio.ifengine.monitor.dto.ValidationException;
import com.ifstudio.ifengine.repository.CodeMapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 코드매핑(CODE_MAP) 관리 서비스. 그룹 단위로 항목 전체를 조회/치환/삭제한다
 * (IF_MAPPING과 동일하게 "그룹 저장 = 전체 치환" 패턴).
 */
@Service
@RequiredArgsConstructor
public class CodeMapService {

    private static final Pattern GROUP_ID_RE = Pattern.compile("^[A-Z0-9_]{1,30}$");

    private final CodeMapRepository repo;

    @Transactional(readOnly = true)
    public List<CodeMapGroupDto> listGroups() {
        return repo.countByGroup().stream()
                .map(g -> new CodeMapGroupDto(g.getGroupId(), g.getCnt()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CodeMapEntryDto> listByGroup(String groupId) {
        return repo.findByGroupIdOrderBySortOrder(groupId).stream()
                .map(CodeMapService::toDto)
                .collect(Collectors.toList());
    }

    /** 그룹 전체 치환 저장. 그룹이 없으면 새로 생성된다(업서트). */
    @Transactional
    public List<CodeMapEntryDto> replaceGroup(String groupId, List<CodeMapEntryDto> entries) {
        ValidationException ve = new ValidationException();
        if (groupId == null || !GROUP_ID_RE.matcher(groupId).matches()) {
            ve.add("groupId", "그룹ID는 영문 대문자·숫자·밑줄 1~30자만 허용됩니다.");
        }
        Set<String> seen = new HashSet<>();
        int i = 0;
        for (CodeMapEntryDto e : entries) {
            String src = e.srcCode == null ? "" : e.srcCode.trim();
            String tgt = e.tgtCode == null ? "" : e.tgtCode.trim();
            if (src.isEmpty()) ve.add("entries[" + i + "].srcCode", (i + 1) + "행: 소스코드는 필수입니다.");
            else if (!seen.add(src)) ve.add("entries[" + i + "].srcCode", (i + 1) + "행: 소스코드 '" + src + "'가 중복됩니다.");
            if (tgt.isEmpty()) ve.add("entries[" + i + "].tgtCode", (i + 1) + "행: 타겟코드는 필수입니다.");
            i++;
        }
        if (ve.hasErrors()) throw ve;

        repo.deleteByGroupId(groupId);
        repo.flush();
        int order = 1;
        for (CodeMapEntryDto e : entries) {
            CodeMap c = new CodeMap();
            c.setGroupId(groupId);
            c.setSrcCode(e.srcCode.trim());
            c.setTgtCode(e.tgtCode.trim());
            c.setDescription(e.description == null || e.description.isBlank() ? null : e.description.trim());
            c.setSortOrder(order++);
            repo.save(c);
        }
        return listByGroup(groupId);
    }

    @Transactional
    public void deleteGroup(String groupId) {
        if (repo.findByGroupIdOrderBySortOrder(groupId).isEmpty()) {
            throw new IllegalArgumentException("코드매핑 그룹 없음: " + groupId);
        }
        repo.deleteByGroupId(groupId);
    }

    private static CodeMapEntryDto toDto(CodeMap c) {
        CodeMapEntryDto d = new CodeMapEntryDto();
        d.id = c.getCodeMapId();
        d.srcCode = c.getSrcCode();
        d.tgtCode = c.getTgtCode();
        d.description = c.getDescription();
        return d;
    }
}
