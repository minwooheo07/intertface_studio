import type { ChannelType, IfMapping } from "./types";

export interface FieldError {
  field: string;
  message: string;
}

const CHANNELS: ChannelType[] = ["DB", "REST", "FILE", "SOCKET"];
// 현재 백엔드에 구현된 어댑터 (미구현 채널은 저장은 되되 경고)
export const IMPLEMENTED_SOURCE: ChannelType[] = ["DB"];
export const IMPLEMENTED_TARGET: ChannelType[] = ["DB", "REST"];

const ID_RE = /^[A-Z0-9_]{1,30}$/;

/** JSON 문자열 유효성. 유효하면 null, 아니면 에러 메시지 */
export function jsonError(raw: string): string | null {
  if (!raw || raw.trim() === "") return null; // 빈 설정 허용({}로 처리)
  try {
    JSON.parse(raw);
    return null;
  } catch (e) {
    return "JSON 형식이 올바르지 않습니다: " + (e as Error).message;
  }
}

/** Quartz cron 간이 검증 (6~7 필드). 정밀 검증은 서버가 수행 */
export function cronError(expr: string | null): string | null {
  if (!expr || expr.trim() === "") return null; // 수동 실행 인터페이스 허용
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 6 || parts.length > 7) {
    return "Quartz cron은 6~7개 필드여야 합니다 (초 분 시 일 월 요일 [연])";
  }
  return null;
}

export interface EditorModel {
  ifId: string;
  ifName: string;
  srcSystem: string;
  tgtSystem: string;
  srcType: ChannelType;
  tgtType: ChannelType;
  srcConfig: string;
  tgtConfig: string;
  cronExpr: string | null;
  dupKeyCols: string | null;
  useYn: "Y" | "N";
  description: string | null;
  mappings: IfMapping[];
}

/** 탭별 에러를 분류해 반환. 키: basic/source/target/mapping */
export function validate(m: EditorModel, mode: "create" | "edit"): Record<string, FieldError[]> {
  const errs: Record<string, FieldError[]> = { basic: [], source: [], target: [], mapping: [] };

  // 기본정보
  if (!m.ifId.trim()) errs.basic.push({ field: "ifId", message: "IF ID는 필수입니다." });
  else if (mode === "create" && !ID_RE.test(m.ifId))
    errs.basic.push({ field: "ifId", message: "영문 대문자·숫자·밑줄 1~30자만 허용됩니다." });
  if (!m.ifName.trim()) errs.basic.push({ field: "ifName", message: "이름은 필수입니다." });
  if (!CHANNELS.includes(m.srcType)) errs.basic.push({ field: "srcType", message: "소스 채널유형이 올바르지 않습니다." });
  if (!CHANNELS.includes(m.tgtType)) errs.basic.push({ field: "tgtType", message: "타겟 채널유형이 올바르지 않습니다." });
  const ce = cronError(m.cronExpr);
  if (ce) errs.basic.push({ field: "cronExpr", message: ce });

  // 소스/타겟 설정 JSON
  const se = jsonError(m.srcConfig);
  if (se) errs.source.push({ field: "srcConfig", message: se });
  const te = jsonError(m.tgtConfig);
  if (te) errs.target.push({ field: "tgtConfig", message: te });

  // 매핑: 타겟필드 필수·유일, 소스필드는 CONST 룰 아니면 필수
  const seen = new Set<string>();
  m.mappings.forEach((mp, i) => {
    const tgt = (mp.tgtField ?? "").trim();
    if (!tgt) {
      errs.mapping.push({ field: `mappings[${i}].tgtField`, message: `${i + 1}행: 타겟필드는 필수입니다.` });
    } else if (seen.has(tgt.toLowerCase())) {
      errs.mapping.push({ field: `mappings[${i}].tgtField`, message: `${i + 1}행: 타겟필드 '${tgt}'가 중복됩니다.` });
    } else {
      seen.add(tgt.toLowerCase());
    }
    const isConst = (mp.transformRule ?? "").startsWith("CONST:");
    if (!isConst && !(mp.srcField ?? "").trim()) {
      errs.mapping.push({ field: `mappings[${i}].srcField`, message: `${i + 1}행: 소스필드는 필수입니다 (CONST 룰 제외).` });
    }
  });

  return errs;
}

export function totalErrors(errs: Record<string, FieldError[]>): number {
  return Object.values(errs).reduce((a, b) => a + b.length, 0);
}
