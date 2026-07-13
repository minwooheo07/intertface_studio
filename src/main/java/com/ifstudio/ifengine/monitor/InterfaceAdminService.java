package com.ifstudio.ifengine.monitor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ifstudio.ifengine.domain.IfMapping;
import com.ifstudio.ifengine.domain.IfMaster;
import com.ifstudio.ifengine.engine.scheduler.JobRegistrar;
import com.ifstudio.ifengine.monitor.dto.CloneRequest;
import com.ifstudio.ifengine.monitor.dto.InterfaceDetailDto;
import com.ifstudio.ifengine.monitor.dto.ValidationException;
import com.ifstudio.ifengine.repository.IfMappingRepository;
import com.ifstudio.ifengine.repository.IfMasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 인터페이스 정의 CRUD 서비스.
 * 검증 규칙은 프론트 validation.ts와 동일하게 유지한다(서버가 최종 강제).
 * 저장/삭제 후에는 스케줄에 반영한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InterfaceAdminService {

    private static final Pattern ID_RE = Pattern.compile("^[A-Z0-9_]{1,30}$");
    private static final Set<String> CHANNELS = Set.of("DB", "REST", "FILE", "SOCKET");

    private final IfMasterRepository masterRepo;
    private final IfMappingRepository mappingRepo;
    private final JobRegistrar registrar;
    private final ObjectMapper om;

    /** 상세 조회 (마스터 + 매핑) */
    @Transactional(readOnly = true)
    public InterfaceDetailDto get(String ifId) {
        IfMaster m = masterRepo.findById(ifId)
                .orElseThrow(() -> new IllegalArgumentException("인터페이스 없음: " + ifId));
        List<IfMapping> mappings = mappingRepo.findByIfIdOrderBySortOrder(ifId);
        return InterfaceDetailDto.of(m, mappings);
    }

    /** 신규 등록 */
    @Transactional
    public InterfaceDetailDto create(InterfaceDetailDto dto) {
        validate(dto, true);
        if (masterRepo.existsById(dto.master.getIfId())) {
            throw new ValidationException().add("ifId", "이미 존재하는 IF ID입니다: " + dto.master.getIfId());
        }
        save(dto);
        reloadQuietly();
        return get(dto.master.getIfId());
    }

    /** 수정 (매핑은 전체 치환) */
    @Transactional
    public InterfaceDetailDto update(String ifId, InterfaceDetailDto dto) {
        if (!masterRepo.existsById(ifId)) {
            throw new IllegalArgumentException("인터페이스 없음: " + ifId);
        }
        dto.master.setIfId(ifId);            // 경로 우선, ID 변조 방지
        validate(dto, false);
        // 기존 매핑 삭제 후 재삽입
        mappingRepo.deleteAll(mappingRepo.findByIfIdOrderBySortOrder(ifId));
        save(dto);
        reloadQuietly();
        return get(ifId);
    }

    /** 삭제: 기본은 소프트 비활성(useYn=N), hard=true면 물리 삭제 */
    @Transactional
    public void delete(String ifId, boolean hard) {
        IfMaster m = masterRepo.findById(ifId)
                .orElseThrow(() -> new IllegalArgumentException("인터페이스 없음: " + ifId));
        if (hard) {
            mappingRepo.deleteAll(mappingRepo.findByIfIdOrderBySortOrder(ifId));
            masterRepo.delete(m);
        } else {
            m.setUseYn("N");
            masterRepo.save(m);
        }
        reloadQuietly();
    }

    /** 복제: 마스터+매핑 복사, useYn=N으로 생성(테스트 후 활성) */
    @Transactional
    public InterfaceDetailDto clone(String srcId, CloneRequest req) {
        IfMaster src = masterRepo.findById(srcId)
                .orElseThrow(() -> new IllegalArgumentException("인터페이스 없음: " + srcId));
        ValidationException ve = new ValidationException();
        if (req.newIfId == null || req.newIfId.isBlank()) ve.add("newIfId", "새 IF ID는 필수입니다.");
        else if (!ID_RE.matcher(req.newIfId).matches()) ve.add("newIfId", "영문 대문자·숫자·밑줄 1~30자만 허용됩니다.");
        else if (masterRepo.existsById(req.newIfId)) ve.add("newIfId", "이미 존재하는 IF ID입니다: " + req.newIfId);
        if (ve.hasErrors()) throw ve;

        IfMaster copy = new IfMaster();
        copy.setIfId(req.newIfId);
        copy.setIfName(req.newIfName != null && !req.newIfName.isBlank() ? req.newIfName : src.getIfName() + " (복제)");
        copy.setSrcSystem(src.getSrcSystem());
        copy.setTgtSystem(src.getTgtSystem());
        copy.setSrcType(src.getSrcType());
        copy.setTgtType(src.getTgtType());
        copy.setSrcConfig(src.getSrcConfig());
        copy.setTgtConfig(src.getTgtConfig());
        copy.setCronExpr(src.getCronExpr());
        copy.setDupKeyCols(src.getDupKeyCols());
        copy.setUseYn("N");                  // 복제본은 비활성으로
        copy.setDescription(src.getDescription());
        masterRepo.save(copy);

        for (IfMapping m : mappingRepo.findByIfIdOrderBySortOrder(srcId)) {
            IfMapping nm = new IfMapping();
            nm.setIfId(req.newIfId);
            nm.setSrcField(m.getSrcField());
            nm.setTgtField(m.getTgtField());
            nm.setTransformRule(m.getTransformRule());
            nm.setSortOrder(m.getSortOrder());
            mappingRepo.save(nm);
        }
        return get(req.newIfId);
    }

    // ---- 내부 ----

    private void save(InterfaceDetailDto dto) {
        // 빈 설정은 {}로 정규화
        if (dto.master.getSrcConfig() == null || dto.master.getSrcConfig().isBlank()) dto.master.setSrcConfig("{}");
        if (dto.master.getTgtConfig() == null || dto.master.getTgtConfig().isBlank()) dto.master.setTgtConfig("{}");
        if (dto.master.getUseYn() == null || dto.master.getUseYn().isBlank()) dto.master.setUseYn("Y");
        masterRepo.save(dto.master);

        int order = 1;
        for (InterfaceDetailDto.MappingDto md : dto.mappings) {
            IfMapping m = new IfMapping();
            m.setIfId(dto.master.getIfId());
            m.setSrcField(blankToNull(md.srcField));
            m.setTgtField(md.tgtField);
            m.setTransformRule(blankToNull(md.transformRule));
            m.setSortOrder(md.sortOrder != null ? md.sortOrder : order);
            mappingRepo.save(m);
            order++;
        }
    }

    /** 검증 (프론트 validation.ts와 동일 규칙) */
    private void validate(InterfaceDetailDto dto, boolean isCreate) {
        ValidationException ve = new ValidationException();
        IfMaster m = dto.master;

        if (m == null) { throw new ValidationException().add("master", "정의가 비어 있습니다."); }

        if (m.getIfId() == null || m.getIfId().isBlank()) {
            ve.add("ifId", "IF ID는 필수입니다.");
        } else if (isCreate && !ID_RE.matcher(m.getIfId()).matches()) {
            ve.add("ifId", "영문 대문자·숫자·밑줄 1~30자만 허용됩니다.");
        }
        if (m.getIfName() == null || m.getIfName().isBlank()) ve.add("ifName", "이름은 필수입니다.");
        if (m.getSrcType() == null || !CHANNELS.contains(m.getSrcType())) ve.add("srcType", "소스 채널유형이 올바르지 않습니다.");
        if (m.getTgtType() == null || !CHANNELS.contains(m.getTgtType())) ve.add("tgtType", "타겟 채널유형이 올바르지 않습니다.");

        // cron: 있으면 Quartz 유효성
        if (m.getCronExpr() != null && !m.getCronExpr().isBlank() && !CronExpression.isValidExpression(m.getCronExpr())) {
            ve.add("cronExpr", "Quartz cron 표현식이 올바르지 않습니다.");
        }

        // config JSON 유효성
        jsonCheck(ve, "srcConfig", m.getSrcConfig());
        jsonCheck(ve, "tgtConfig", m.getTgtConfig());

        // 매핑: 타겟필드 필수·유일, 소스필드는 CONST 룰 아니면 필수
        Set<String> seen = new HashSet<>();
        int i = 0;
        for (InterfaceDetailDto.MappingDto md : dto.mappings) {
            String tgt = md.tgtField == null ? "" : md.tgtField.trim();
            if (tgt.isEmpty()) {
                ve.add("mappings[" + i + "].tgtField", (i + 1) + "행: 타겟필드는 필수입니다.");
            } else if (!seen.add(tgt.toLowerCase())) {
                ve.add("mappings[" + i + "].tgtField", (i + 1) + "행: 타겟필드 '" + tgt + "'가 중복됩니다.");
            }
            boolean isConst = md.transformRule != null && md.transformRule.startsWith("CONST:");
            if (!isConst && (md.srcField == null || md.srcField.trim().isEmpty())) {
                ve.add("mappings[" + i + "].srcField", (i + 1) + "행: 소스필드는 필수입니다 (CONST 룰 제외).");
            }
            i++;
        }

        if (ve.hasErrors()) throw ve;
    }

    private void jsonCheck(ValidationException ve, String field, String json) {
        if (json == null || json.isBlank()) return;
        try {
            om.readTree(json);
        } catch (Exception e) {
            ve.add(field, "JSON 형식이 올바르지 않습니다.");
        }
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private void reloadQuietly() {
        try {
            registrar.reload();
        } catch (Exception e) {
            log.warn("스케줄 재적재 실패(저장은 완료됨): {}", e.getMessage());
        }
    }
}
