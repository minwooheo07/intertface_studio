// 백엔드 DTO 대응 타입

export type ChannelType = "DB" | "REST" | "FILE" | "SOCKET";

export interface IfMaster {
  ifId: string;
  ifName: string;
  srcSystem: string;
  tgtSystem: string;
  srcType: ChannelType;
  tgtType: ChannelType;
  srcConfig: string;   // JSON 원문
  tgtConfig: string;   // JSON 원문
  cronExpr: string | null;
  dupKeyCols: string | null;
  useYn: "Y" | "N";
  description: string | null;
}

export interface IfMapping {
  mappingId?: number;
  srcField: string | null;
  tgtField: string;
  transformRule: string | null;
  sortOrder: number;
}

export interface InterfaceDetail {
  master: IfMaster;
  mappings: IfMapping[];
}

// 목록 행 (요약 + 최근 실행 상태)
export interface InterfaceSummary {
  ifId: string;
  ifName: string;
  srcSystem: string;
  tgtSystem: string;
  srcType: ChannelType;
  tgtType: ChannelType;
  cronExpr: string | null;
  useYn: "Y" | "N";
  lastStatus?: "SUCCESS" | "FAIL" | "SKIP";
  lastAt?: string;
  [key: string]: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
}

// 시험실행 결과 (백엔드 TestRunResultDto 대응)
export interface TargetPreview {
  type: ChannelType;
  body?: string | null;
  bindParams?: Record<string, unknown> | null;
  dryRun?: boolean | null;
  note?: string | null;
}

export interface TestRunResult {
  columns: string[];
  sampleRow: Record<string, unknown> | null;
  mappedRecord: Record<string, unknown> | null;
  targetPreview: TargetPreview | null;
  warnings: string[];
}

// API 테스터 (백엔드 HttpTestDto 대응)
export interface HttpTestRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyType: "NONE" | "JSON" | "FORM" | "RAW";
  body?: string;
  contentType?: string;
  timeoutSec?: number;
}
export interface HttpTestResponse {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string> | null;
  body: string | null;
  bodyTruncated: boolean;
  error: string | null;
}

// 코드 생성
export type CodeGenKind = "INTEGRATION" | "CRUD";
export interface CodeGenRequest {
  definition: InterfaceDetail;
  kind: CodeGenKind;
  framework: string;      // spring (추후 chamomile)
  basePackage: string;
}
/** 파일경로 → 내용 */
export type CodeGenResult = Record<string, string>;
