// 매핑 편집 중 변환 미리보기용. 백엔드 MappingTransformer.applyRule과 동일 규칙 유지.
// (주의: 규칙을 백엔드와 함께 변경할 것. 최종 판정은 항상 백엔드/시험실행)

export function applyRule(rule: string | null, v: unknown): unknown {
  if (!rule || rule.trim() === "") return v;
  if (rule.startsWith("CONST:")) return rule.substring("CONST:".length);
  if (rule.startsWith("DEFAULT:")) return v != null && v !== "" ? v : rule.substring("DEFAULT:".length);
  if (rule.startsWith("DATEFMT:")) {
    if (v == null) return null;
    // 미리보기는 yyyyMMdd>yyyy-MM-dd 형태만 간이 처리(정확한 변환은 백엔드)
    const s = String(v).trim();
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
  }
  if (rule.startsWith("CODEMAP:")) return v; // 실제 매핑은 백엔드
  return v;
}
