import { useMemo, useState } from "react";
import type { EditorModel } from "../../validation";
import type { TestRunResult } from "../../types";
import { applyRule } from "./transformPreview";
import { Pipe } from "../ui/Pipe";
import { Card } from "../ui/Card";
import { Banner } from "../ui/Banner";
import { CodeBox } from "../ui/CodeBox";
import { Button } from "../ui/Button";
import { interfacesApi } from "../../api/interfaces";
import { PlayCircle, Loader2 } from "lucide-react";

interface Props { model: EditorModel; }

function parse(json: string): Record<string, any> {
  try { return json?.trim() ? JSON.parse(json) : {}; } catch { return {}; }
}
function toForm(params: Record<string, unknown>): string {
  return Object.entries(params).filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

export default function TestTab({ model }: Props) {
  const srcFields = useMemo(() => model.mappings.map((m) => (m.srcField ?? "").trim()).filter(Boolean), [model.mappings]);
  const [sample, setSample] = useState<Record<string, string>>({});
  const srcRow: Record<string, unknown> = {};
  srcFields.forEach((f) => (srcRow[f] = sample[f] ?? `<${f}>`));
  const mapped: Record<string, unknown> = {};
  model.mappings.forEach((m) => { if (m.tgtField) mapped[m.tgtField] = applyRule(m.transformRule, m.srcField ? srcRow[m.srcField] : undefined); });

  let restPreview: string | null = null;
  let restDryRun = false;
  if (model.tgtType === "REST") {
    const cfg = parse(model.tgtConfig);
    restDryRun = !!cfg.dryRun;
    const merged = { ...(cfg.constParams ?? {}), ...mapped };
    restPreview = cfg.bodyType === "JSON" ? JSON.stringify(merged, null, 2) : toForm(merged);
    restPreview = restPreview
      .replace(/(clientSecret|token|password)=([^&]+)/gi, "$1=****")
      .replace(/"(clientSecret|token|password)"\s*:\s*"[^"]*"/gi, '"$1":"****"');
  }

  // 실제 시험실행 (백엔드: 소스 1건 조회 + 매핑 변환 + 타겟 미리보기, 실전송 없음)
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);

  async function doTestRun() {
    setRunning(true); setRunErr(null); setRunResult(null);
    try {
      const res = await interfacesApi.testRun({
        master: { ...model, srcConfig: model.srcConfig || "{}", tgtConfig: model.tgtConfig || "{}" },
        mappings: model.mappings,
      });
      setRunResult(res);
    } catch (e: any) {
      setRunErr(e.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 실제 시험실행 (백엔드 연동) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">시험실행</span>
            <p className="mt-1 text-sm text-fg-muted">
              실제 소스에서 1건을 가져와 매핑·타겟 미리보기까지 검증합니다. 저장 없이 실행 가능하며, 실제 전송·적재는 하지 않습니다.
            </p>
          </div>
          <Button variant="primary" onClick={doTestRun} disabled={running || model.srcType !== "DB"}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {running ? "실행 중…" : "시험실행"}
          </Button>
        </div>

        {model.srcType !== "DB" && (
          <Banner tone="info" title={`${model.srcType} 소스는 아직 시험실행 미지원`}
            description="현재 백엔드는 DB 소스만 시험실행을 지원합니다. 어댑터 구현 후 확장됩니다." />
        )}
        {runErr && <Banner tone="danger" title="시험실행 실패" description={runErr} />}

        {runResult && (
          <div className="space-y-4">
            {runResult.warnings?.length > 0 && (
              <Banner tone="warn" title="확인 필요" description={runResult.warnings.join(" · ")} />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  소스 실제 값 {runResult.columns?.length ? `(컬럼 ${runResult.columns.length}개)` : ""}
                </span>
                <div className="mt-2">
                  <CodeBox code={runResult.sampleRow ? JSON.stringify(runResult.sampleRow, null, 2) : "(결과 0건)"} />
                </div>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">변환 결과 (실값)</span>
                <div className="mt-2">
                  <CodeBox code={runResult.mappedRecord ? JSON.stringify(runResult.mappedRecord, null, 2) : "(매핑 없음)"} />
                </div>
              </div>
            </div>
            {runResult.targetPreview && (
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  타겟 미리보기 ({runResult.targetPreview.type})
                </span>
                <div className="mt-2">
                  <CodeBox code={
                    runResult.targetPreview.body
                      ?? (runResult.targetPreview.bindParams ? JSON.stringify(runResult.targetPreview.bindParams, null, 2) : "")
                  } />
                </div>
                {runResult.targetPreview.note && (
                  <p className="mt-1.5 text-xs text-fg-muted">{runResult.targetPreview.note}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 로컬 미리보기 (입력값 임의 지정, 저장 전에도 즉시 계산) */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">로컬 미리보기 (가상 값)</span>
          <Pipe src={`${model.srcSystem || "소스"}·${model.srcType}`} tgt={`${model.tgtSystem || "타겟"}·${model.tgtType}`} />
        </div>

        {srcFields.length > 0 && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">샘플 소스 값 (직접 입력)</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {srcFields.map((f) => (
                <label key={f} className="text-xs text-fg-muted">
                  <span className="font-mono">{f}</span>
                  <input value={sample[f] ?? ""} placeholder={`<${f}>`}
                    onChange={(e) => setSample({ ...sample, [f]: e.target.value })}
                    className="ml-1.5 w-32 rounded border border-border bg-surface px-2 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent/40" />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">변환 결과 (타겟 레코드)</span>
            <div className="mt-2"><CodeBox code={JSON.stringify(mapped, null, 2)} /></div>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
              {model.tgtType === "REST" ? "전송 바디 (조립 결과)" : "적재 대상"}
            </span>
            <div className="mt-2">
              {model.tgtType === "REST"
                ? <CodeBox code={restPreview ?? ""} />
                : <Banner tone="info" title={`${model.tgtType} 타겟`} description="위 변환 결과가 적재 쿼리의 :바인딩 파라미터로 들어갑니다." />}
            </div>
          </div>
        </div>

        {model.tgtType === "REST" && (
          <Banner tone={restDryRun ? "info" : "warn"}
            title={restDryRun ? "dryRun ON — 전송 없이 로그만" : "dryRun OFF — 실행 시 실제 전송"}
            description={restDryRun
              ? "저장 후 실행해도 실제 전송 없이 요청 내용만 로그에 남습니다 (안전)."
              : "인증키 미발급 단계라면 타겟 설정에서 dryRun을 켜두세요."} />
        )}
      </Card>
    </div>
  );
}
