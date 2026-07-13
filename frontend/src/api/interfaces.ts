import { api } from "./client";
import type { InterfaceDetail, InterfaceSummary, TestRunResult } from "../types";

export interface ListFilters {
  keyword?: string;
  srcSystem?: string;
  tgtSystem?: string;
  srcType?: string;
  useYn?: string;
}

function qs(f: ListFilters): string {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const interfacesApi = {
  list: (f: ListFilters = {}) => api.get<InterfaceSummary[]>(`/api/interfaces${qs(f)}`),
  get: (id: string) => api.get<InterfaceDetail>(`/api/interfaces/${id}`),
  create: (d: InterfaceDetail) => api.post<InterfaceDetail>(`/api/interfaces`, d),
  update: (id: string, d: InterfaceDetail) => api.put<InterfaceDetail>(`/api/interfaces/${id}`, d),
  remove: (id: string, hard = false) => api.del<void>(`/api/interfaces/${id}${hard ? "?hard=true" : ""}`),
  clone: (id: string, newIfId: string, newIfName: string) =>
    api.post<InterfaceDetail>(`/api/interfaces/${id}/clone`, { newIfId, newIfName }),
  run: (id: string) => api.post<unknown>(`/api/interfaces/${id}/run`),
  testRun: (d: InterfaceDetail) => api.post<TestRunResult>(`/api/interfaces/test-run`, d),
};

// 대시보드 요약
export interface DashboardSummary {
  success: number;
  fail: number;
  skip: number;
  asOf: string;
}
export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/api/dashboard/summary"),
};

// 포스트맨식 API 테스터 (주의: 실제 호출)
import type { HttpTestRequest, HttpTestResponse } from "../types";
export const httpTestApi = {
  run: (r: HttpTestRequest) => api.post<HttpTestResponse>("/api/http-test", r),
};

// 소스 코드 생성
import type { CodeGenRequest, CodeGenResult } from "../types";
export const codegenApi = {
  preview: (r: CodeGenRequest) => api.post<CodeGenResult>("/api/codegen/preview", r),
  downloadUrl: "/api/codegen/download",
};
