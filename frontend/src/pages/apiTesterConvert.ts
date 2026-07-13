import type { HttpTestRequest } from "../types";

/**
 * API 테스터의 요청을 인터페이스 REST 타겟 설정(tgtConfig)으로 변환한다.
 *
 * 핵심 차이:
 *  - 테스터의 바디는 "고정 값"이다: {"billNo": "B20260712001"}
 *  - 인터페이스의 바디는 "소스에서 채워질 필드"다: billNo ← 소스의 BILL_NO 컬럼
 *
 * 그래서 바디의 각 키를 어디로 보낼지 사용자가 정해야 한다:
 *  - MAPPING:  소스 데이터에서 매번 채워짐 → 필드매핑 탭의 타겟필드가 됨 (tgtConfig에 안 들어감)
 *  - CONST:    매번 같은 고정값 → constParams
 *  - AUTH:     인증정보 → auth.fields (환경변수 참조로 치환 권장)
 *  - SKIP:     버림
 */

export type KeyRole = "MAPPING" | "CONST" | "AUTH" | "SKIP";

export interface BodyKey {
  key: string;
  value: string;
  role: KeyRole;
}

/** 인증으로 추정되는 키 이름 (초기 role 자동 추천용) */
const AUTH_HINTS = ["clientid", "clientsecret", "secret", "token", "apikey", "api_key", "accesskey", "password", "appkey"];

/** 바디 원문을 키-값 목록으로 파싱. bodyType에 따라 JSON/FORM 파싱. */
export function parseBodyKeys(bodyType: string, body: string): BodyKey[] {
  if (!body?.trim()) return [];

  const entries: [string, string][] = [];
  if (bodyType === "JSON") {
    try {
      const o = JSON.parse(body);
      if (o && typeof o === "object" && !Array.isArray(o)) {
        Object.entries(o).forEach(([k, v]) => entries.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]));
      }
    } catch {
      return []; // 파싱 실패 → 키 추출 불가 (RAW로 취급)
    }
  } else if (bodyType === "FORM") {
    body.split("&").forEach((pair) => {
      const i = pair.indexOf("=");
      if (i > 0) {
        entries.push([
          decodeURIComponent(pair.slice(0, i).trim()),
          decodeURIComponent(pair.slice(i + 1)),
        ]);
      }
    });
  } else {
    return []; // NONE/RAW는 키 단위 분해 불가
  }

  return entries.map(([key, value]) => ({
    key,
    value,
    role: guessRole(key),
  }));
}

function guessRole(key: string): KeyRole {
  const k = key.toLowerCase();
  if (AUTH_HINTS.some((h) => k === h || k.replace(/[_-]/g, "") === h)) return "AUTH";
  return "MAPPING"; // 기본은 매핑 (소스에서 채워질 값)으로 추정
}

/** 인증 값을 환경변수 참조로 변환: 실제 시크릿을 DB에 저장하지 않기 위함 */
export function toEnvRef(key: string): string {
  return "${" + key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase() + "}";
}

export interface ConvertResult {
  /** 인터페이스 편집기의 tgtConfig에 넣을 JSON 문자열 */
  tgtConfig: string;
  /** 필드매핑 탭에 만들 타겟필드 목록 (소스필드는 사용자가 채움) */
  mappingTargets: string[];
  /** 사용자에게 알릴 주의사항 */
  warnings: string[];
}

export function convertToTargetConfig(req: HttpTestRequest, keys: BodyKey[]): ConvertResult {
  const warnings: string[] = [];
  const cfg: Record<string, any> = {
    url: req.url,
    method: req.method || "POST",
    bodyType: req.bodyType === "JSON" ? "JSON" : "FORM",
    charset: "UTF-8",
    // 안전 기본값: 가져온 직후엔 실제 전송하지 않도록 dryRun을 켜둔다.
    dryRun: true,
  };

  // 헤더 → 인증 헤더로 옮길지 판단
  const authHeaderEntries = Object.entries(req.headers ?? {}).filter(([k]) => {
    const lk = k.toLowerCase();
    return lk === "authorization" || lk.startsWith("x-api") || lk.includes("token") || lk.includes("key");
  });

  const authFields: Record<string, string> = {};
  const constParams: Record<string, string> = {};
  const mappingTargets: string[] = [];

  keys.forEach(({ key, value, role }) => {
    if (role === "AUTH") authFields[key] = toEnvRef(key);
    else if (role === "CONST") constParams[key] = value;
    else if (role === "MAPPING") mappingTargets.push(key);
    // SKIP은 버림
  });

  if (Object.keys(authFields).length > 0) {
    cfg.auth = { in: "BODY", fields: authFields };
    warnings.push("인증 필드는 실제 값 대신 환경변수 참조(${...})로 넣었습니다. 서버 환경변수에 값을 설정하세요.");
  }
  if (authHeaderEntries.length > 0) {
    const headerFields: Record<string, string> = {};
    authHeaderEntries.forEach(([k]) => (headerFields[k] = toEnvRef(k.replace(/-/g, "_"))));
    cfg.auth = { in: "HEADER", fields: { ...(cfg.auth?.fields ?? {}), ...headerFields } };
    warnings.push(`인증 헤더(${authHeaderEntries.map(([k]) => k).join(", ")})를 환경변수 참조로 옮겼습니다.`);
    if (Object.keys(authFields).length > 0) {
      warnings.push("바디 인증과 헤더 인증이 함께 감지됐습니다. auth.in은 하나만 선택 가능하니 타겟 탭에서 확인하세요.");
    }
  }
  if (Object.keys(constParams).length > 0) cfg.constParams = constParams;

  if (mappingTargets.length === 0) {
    warnings.push("매핑으로 지정한 필드가 없습니다. 소스 데이터에서 채워질 값이 없다면 이 인터페이스는 항상 같은 값만 보냅니다.");
  }
  if (req.bodyType === "RAW" || req.bodyType === "NONE") {
    warnings.push("RAW/NONE 바디는 키 단위로 분해할 수 없어 매핑을 만들지 못했습니다. 타겟 설정만 가져왔습니다.");
  }

  warnings.push("안전을 위해 dryRun=true로 설정했습니다. 실제 전송하려면 타겟 탭에서 끄세요.");

  return {
    tgtConfig: JSON.stringify(cfg, null, 2),
    mappingTargets,
    warnings,
  };
}
