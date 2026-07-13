package com.ifstudio.ifengine.codegen;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ifstudio.ifengine.domain.IfMapping;
import com.ifstudio.ifengine.domain.IfMaster;
import com.ifstudio.ifengine.engine.adapter.DataSourceRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSetMetaData;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 인터페이스 정의 → 소스코드 생성.
 *
 * 설계 원칙: **생성 로직과 템플릿을 분리한다.**
 *  - 이 클래스는 "무엇을 만들지"(클래스명·필드·타입·매핑식)를 계산해 컨텍스트로 만든다. 프레임워크 중립.
 *  - "어떻게 생겼는지"는 resources/codegen/{framework}/*.tpl 이 결정한다.
 *  → 나중에 캐모마일 샘플을 받으면 codegen/chamomile/ 폴더만 추가하면 된다. 이 클래스는 안 바뀐다.
 *
 * 생성 종류:
 *  - INTEGRATION: 이 인터페이스와 동일하게 동작하는 연동 코드 (엔진 없이 앱 안에서 직접 실행)
 *  - CRUD: 소스 테이블 기준 CRUD 스캐폴드
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CodeGenService {

    private final DataSourceRegistry registry;
    private final ObjectMapper om;

    /** 생성 결과: 파일경로 → 내용 */
    public Map<String, String> generate(IfMaster master, List<IfMapping> mappings,
                                        CodeGenModel.Kind kind, String framework, String basePackage) {
        if (master == null) throw new IllegalArgumentException("인터페이스 정의가 없습니다.");
        if (!"DB".equalsIgnoreCase(master.getSrcType())) {
            throw new IllegalArgumentException(
                    "코드 생성은 현재 DB 소스만 지원합니다 (" + master.getSrcType() + "). 소스 컬럼 정보를 얻을 수 없습니다.");
        }
        String fw = (framework == null || framework.isBlank()) ? "spring" : framework.toLowerCase();
        String pkg = (basePackage == null || basePackage.isBlank()) ? "com.example.generated" : basePackage.trim();

        JsonNode srcCfg = parse(master.getSrcConfig());
        String query = text(srcCfg, "query");
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("소스 쿼리가 없습니다. 소스 탭에서 수집 쿼리를 입력하세요.");
        }

        // 컬럼 메타데이터 조회 (타입까지) — 데이터 0건이어도 구조는 얻는다
        List<CodeGenModel.Field> fields = describeColumns(text(srcCfg, "datasource"), query);

        Map<String, Object> ctx = buildContext(master, mappings, fields, srcCfg, kind, pkg);
        return renderFiles(fw, kind, ctx, pkg, String.valueOf(ctx.get("className")),
                "REST".equalsIgnoreCase(master.getTgtType()));
    }

    /** 소스 쿼리의 컬럼명 + JDBC 타입을 읽어 VO 필드로 만든다. setMaxRows(1)로 안전하게. */
    private List<CodeGenModel.Field> describeColumns(String datasource, String query) {
        JdbcTemplate jt = new JdbcTemplate(registry.get(datasource));
        jt.setMaxRows(1);
        try {
            return jt.query(query, rs -> {
                ResultSetMetaData md = rs.getMetaData();
                List<CodeGenModel.Field> out = new ArrayList<>();
                for (int i = 1; i <= md.getColumnCount(); i++) {
                    String col = md.getColumnLabel(i);
                    out.add(new CodeGenModel.Field(
                            col,
                            CodeGenNaming.toCamel(col),
                            CodeGenNaming.javaType(md.getColumnType(i))
                    ));
                }
                return out;
            });
        } catch (Exception e) {
            Throwable t = e;
            while (t.getCause() != null && t.getCause() != t) t = t.getCause();
            throw new IllegalArgumentException("소스 쿼리 실행 실패(컬럼 정보를 읽을 수 없음): " + t.getMessage());
        }
    }

    private Map<String, Object> buildContext(IfMaster m, List<IfMapping> mappings,
                                             List<CodeGenModel.Field> fields, JsonNode srcCfg,
                                             CodeGenModel.Kind kind, String pkg) {
        Map<String, Object> ctx = new HashMap<>();
        String className = CodeGenNaming.toClassName(m.getIfId());
        boolean isRest = "REST".equalsIgnoreCase(m.getTgtType());

        ctx.put("basePackage", pkg);
        ctx.put("className", className);
        ctx.put("ifId", m.getIfId());
        ctx.put("ifName", nvl(m.getIfName()));
        ctx.put("isDbTarget", !isRest);
        ctx.put("isRestTarget", isRest);
        ctx.put("hasDupKey", m.getDupKeyCols() != null && !m.getDupKeyCols().isBlank());
        ctx.put("dupKeyCols", nvl(m.getDupKeyCols()));

        // 소스
        String query = text(srcCfg, "query");
        String markQuery = text(srcCfg, "markQuery");
        ctx.put("srcQuery", query);
        ctx.put("hasMarkQuery", markQuery != null && !markQuery.isBlank());
        ctx.put("srcMarkQueryMyBatis", toMyBatisParams(markQuery));

        String table = CodeGenNaming.extractTable(query);
        ctx.put("srcTable", table == null ? "TODO_TABLE" : table);
        ctx.put("urlPath", table == null ? "todo" : table.toLowerCase().replace('_', '-').replace(".", "/"));

        // 필드
        ctx.put("srcFields", fields.stream().map(f -> {
            Map<String, Object> mm = new HashMap<>();
            mm.put("columnName", f.columnName);
            mm.put("javaName", f.javaName);
            mm.put("javaType", f.javaType);
            return mm;
        }).collect(Collectors.toList()));

        // CRUD용 파생값
        if (!fields.isEmpty()) {
            ctx.put("columnList", fields.stream().map(f -> f.columnName).collect(Collectors.joining(", ")));
            ctx.put("insertValues", fields.stream().map(f -> "#{" + f.javaName + "}").collect(Collectors.joining(", ")));
            ctx.put("updateSet", fields.stream().skip(1)
                    .map(f -> f.columnName + " = #{" + f.javaName + "}").collect(Collectors.joining(",\n               ")));
            CodeGenModel.Field pk = fields.get(0); // 첫 컬럼을 PK로 가정 (템플릿에 경고 주석 있음)
            ctx.put("pkColumn", pk.columnName);
            ctx.put("pkJavaName", pk.javaName);
        }

        // 타겟
        JsonNode tgtCfg = parse(m.getTgtConfig());
        if (isRest) {
            ctx.put("tgtUrl", nvl(text(tgtCfg, "url")));
            ctx.put("tgtMethod", nvl2(text(tgtCfg, "method"), "POST").toUpperCase());
            ctx.put("isFormBody", !"JSON".equalsIgnoreCase(nvl2(text(tgtCfg, "bodyType"), "FORM")));
            ctx.put("authFields", authFields(tgtCfg));
            ctx.put("constParams", constParams(tgtCfg));
        } else {
            ctx.put("tgtInsertQueryMyBatis", toMyBatisParams(text(tgtCfg, "insertQuery")));
        }

        // 매핑 → Java 표현식
        List<Map<String, Object>> mps = new ArrayList<>();
        Map<String, String> colToJava = fields.stream()
                .collect(Collectors.toMap(f -> f.columnName, f -> f.javaName, (a, b) -> a));
        for (IfMapping mp : mappings == null ? List.<IfMapping>of() : mappings) {
            if (mp.getTgtField() == null || mp.getTgtField().isBlank()) continue;
            Map<String, Object> e = new HashMap<>();
            String srcJava = mp.getSrcField() == null ? null
                    : colToJava.getOrDefault(mp.getSrcField(), CodeGenNaming.toCamel(mp.getSrcField()));
            String getter = srcJava == null ? "null" : "src.get" + CodeGenNaming.toPascal(srcJava) + "()";
            String rule = mp.getTransformRule();
            e.put("tgtField", mp.getTgtField());
            e.put("transformRule", nvl(rule));
            e.put("javaExpr", CodeGenNaming.toJavaExpr(rule, getter));
            // 엔진이 아는 룰이 아니면 개발자가 확인하도록 TODO를 붙인다
            e.put("needsTodo", rule != null && !rule.isBlank()
                    && !(rule.startsWith("CONST:") || rule.startsWith("DEFAULT:")
                         || rule.startsWith("DATEFMT:") || rule.startsWith("CODEMAP:")));
            mps.add(e);
        }
        ctx.put("mappings", mps);
        return ctx;
    }

    /** :param → #{param} (MyBatis 문법으로) */
    private String toMyBatisParams(String sql) {
        if (sql == null) return "";
        return sql.replaceAll(":(\\w+)", "#{$1}");
    }

    private List<Map<String, Object>> authFields(JsonNode tgtCfg) {
        List<Map<String, Object>> out = new ArrayList<>();
        JsonNode auth = tgtCfg.get("auth");
        if (auth == null || !auth.hasNonNull("fields")) return out;
        auth.get("fields").fields().forEachRemaining(e -> {
            Map<String, Object> f = new HashMap<>();
            String name = e.getKey();
            f.put("name", name);
            f.put("javaName", CodeGenNaming.toCamel(name));
            // ${ENV_VAR} → 프로퍼티 키로 (@Value("${env.var:}"))
            String v = e.getValue().asText("");
            String envRef = v.startsWith("${") && v.endsWith("}") ? v.substring(2, v.length() - 1) : name;
            f.put("envRef", envRef);
            out.add(f);
        });
        return out;
    }

    private List<Map<String, Object>> constParams(JsonNode tgtCfg) {
        List<Map<String, Object>> out = new ArrayList<>();
        JsonNode cp = tgtCfg.get("constParams");
        if (cp == null) return out;
        cp.fields().forEachRemaining(e -> {
            Map<String, Object> f = new HashMap<>();
            f.put("key", e.getKey());
            f.put("value", e.getValue().asText(""));
            out.add(f);
        });
        return out;
    }

    /** 템플릿을 읽어 파일들을 만든다. 어떤 파일이 필요한지는 kind가 결정. */
    private Map<String, String> renderFiles(String fw, CodeGenModel.Kind kind, Map<String, Object> ctx,
                                            String pkg, String className, boolean isRest) {
        String pkgPath = "src/main/java/" + pkg.replace('.', '/');
        Map<String, String> files = new LinkedHashMap<>();

        // VO는 두 종류 모두 필요
        files.put(pkgPath + "/vo/" + className + "Vo.java", render(fw, "Vo.java.tpl", ctx));

        if (kind == CodeGenModel.Kind.INTEGRATION) {
            files.put(pkgPath + "/service/" + className + "Service.java", render(fw, "IntegrationService.java.tpl", ctx));
            files.put(pkgPath + "/dao/" + className + "Dao.java", render(fw, "IntegrationDao.java.tpl", ctx));
            files.put("src/main/resources/mapper/" + className + "Mapper.xml", render(fw, "IntegrationMapper.xml.tpl", ctx));
            if (isRest) {
                files.put(pkgPath + "/service/" + className + "Sender.java", render(fw, "RestSender.java.tpl", ctx));
            }
            // 생성된 코드가 DateUtils.reformat()을 호출하면 그 클래스도 함께 만들어야 컴파일된다
            if (usesDateUtils(ctx)) {
                files.put(pkgPath + "/util/DateUtils.java", render(fw, "DateUtils.java.tpl", ctx));
            }
        } else {
            files.put(pkgPath + "/controller/" + className + "Controller.java", render(fw, "CrudController.java.tpl", ctx));
            files.put(pkgPath + "/service/" + className + "CrudService.java", render(fw, "CrudService.java.tpl", ctx));
            files.put(pkgPath + "/dao/" + className + "CrudDao.java", render(fw, "CrudDao.java.tpl", ctx));
            files.put("src/main/resources/mapper/" + className + "CrudMapper.xml", render(fw, "CrudMapper.xml.tpl", ctx));
        }
        return files;
    }

    /** 매핑 중 DATEFMT 룰이 하나라도 있으면 DateUtils가 필요하다 */
    @SuppressWarnings("unchecked")
    private boolean usesDateUtils(Map<String, Object> ctx) {
        Object mps = ctx.get("mappings");
        if (!(mps instanceof List<?> list)) return false;
        for (Object o : list) {
            if (o instanceof Map<?, ?> m) {
                Object expr = m.get("javaExpr");
                if (expr != null && String.valueOf(expr).contains("DateUtils.")) return true;
            }
        }
        return false;
    }

    private String render(String fw, String tplName, Map<String, Object> ctx) {
        String path = "codegen/" + fw + "/" + tplName;
        try {
            byte[] bytes = new ClassPathResource(path).getInputStream().readAllBytes();
            return MiniTemplate.render(new String(bytes, StandardCharsets.UTF_8), ctx);
        } catch (Exception e) {
            throw new IllegalArgumentException("템플릿을 읽을 수 없습니다: " + path
                    + " (프레임워크 '" + fw + "'가 지원되지 않거나 템플릿이 없습니다)");
        }
    }

    private JsonNode parse(String raw) {
        try {
            return om.readTree((raw == null || raw.isBlank()) ? "{}" : raw);
        } catch (Exception e) {
            throw new IllegalArgumentException("설정 JSON 형식이 올바르지 않습니다.");
        }
    }
    private String text(JsonNode n, String f) {
        return (n != null && n.hasNonNull(f)) ? n.get(f).asText() : null;
    }
    private String nvl(String s) { return s == null ? "" : s; }
    private String nvl2(String s, String d) { return (s == null || s.isBlank()) ? d : s; }
}
