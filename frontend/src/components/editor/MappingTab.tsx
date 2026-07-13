import { useMemo, useState } from "react";
import type { IfMapping } from "../../types";
import type { EditorModel, FieldError } from "../../validation";
import { applyRule } from "./transformPreview";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { CodeBox } from "../ui/CodeBox";
import { Banner } from "../ui/Banner";
import { cn } from "../../lib/cn";
import { interfacesApi } from "../../api/interfaces";
import { ArrowUp, ArrowDown, X, Plus, Wand2, Loader2 } from "lucide-react";

interface Props {
  model: EditorModel; errors: FieldError[]; onChange: (patch: Partial<EditorModel>) => void;
}
const RULE_HELP = "빈칸=그대로 · CONST:값 · DEFAULT:값 · DATEFMT:yyyyMMdd>yyyy-MM-dd · CODEMAP:그룹ID";

export default function MappingTab({ model, errors, onChange }: Props) {
  const rows = model.mappings;
  const rowErr = (i: number, f: string) => errors.some((e) => e.field === `mappings[${i}].${f}`);
  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);

  async function autoDraft() {
    setDrafting(true); setDraftErr(null);
    try {
      const res = await interfacesApi.testRun({
        master: { ...model, srcConfig: model.srcConfig || "{}", tgtConfig: model.tgtConfig || "{}" },
        mappings: model.mappings,
      });
      if (!res.columns || res.columns.length === 0) {
        setDraftErr("소스에서 컬럼을 찾지 못했습니다. 소스 탭의 쿼리를 확인하세요.");
        return;
      }
      const existing = new Set(rows.map((r) => (r.srcField ?? "").trim()));
      const draftRows: IfMapping[] = res.columns
        .filter((c) => !existing.has(c))
        .map((c, i) => ({ srcField: c, tgtField: c, transformRule: null, sortOrder: rows.length + i + 1 }));
      if (draftRows.length === 0) {
        setDraftErr("모든 컬럼이 이미 매핑되어 있습니다.");
        return;
      }
      set([...rows, ...draftRows]);
    } catch (e: any) {
      setDraftErr(e.message ?? String(e));
    } finally {
      setDrafting(false);
    }
  }

  const set = (next: IfMapping[]) => { next.forEach((m, i) => (m.sortOrder = i + 1)); onChange({ mappings: next }); };
  const update = (i: number, patch: Partial<IfMapping>) => set(rows.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const add = () => set([...rows, { srcField: "", tgtField: "", transformRule: null, sortOrder: rows.length + 1 }]);
  const remove = (i: number) => set(rows.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= rows.length) return;
    const next = [...rows]; [next[i], next[j]] = [next[j], next[i]]; set(next);
  };

  const [sample, setSample] = useState<Record<string, string>>({});
  const srcFields = useMemo(() => rows.map((r) => (r.srcField ?? "").trim()).filter((s) => s.length > 0), [rows]);
  const previewSrc: Record<string, unknown> = {};
  srcFields.forEach((f) => (previewSrc[f] = sample[f] ?? `<${f}>`));
  const previewTgt: Record<string, unknown> = {};
  rows.forEach((r) => { if (r.tgtField) previewTgt[r.tgtField] = applyRule(r.transformRule, r.srcField ? previewSrc[r.srcField] : undefined); });

  const iconBtn = "grid h-8 w-8 place-items-center rounded-md text-fg-subtle hover:bg-muted hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition-colors";

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">필드 매핑</span>
        <div className="flex gap-2">
          {model.srcType === "DB" && (
            <Button size="sm" variant="ghost" onClick={autoDraft} disabled={drafting}>
              {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              자동 매핑 초안
            </Button>
          )}
          <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5" />행 추가</Button>
        </div>
      </div>

      {draftErr && (
        <div className="mb-3">
          <Banner tone="warn" title="자동 매핑 초안 실패" description={draftErr} />
        </div>
      )}

      <div className="grid grid-cols-[32px_1fr_1fr_1fr_108px] gap-2 px-1 pb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
        <span>#</span><span>소스 필드</span><span>타겟 필드</span><span>변환 룰</span><span />
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-fg-muted">매핑이 없습니다. [행 추가]로 시작하세요.</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((m, i) => (
            <div key={i} className="grid grid-cols-[32px_1fr_1fr_1fr_108px] gap-2 items-start">
              <div className="pt-2 text-center text-xs text-fg-subtle tabular-nums">{i + 1}</div>
              <Input value={m.srcField ?? ""} placeholder="SRC_COL" mono
                className={cn(rowErr(i, "srcField") && "input-invalid")}
                onValue={(v) => update(i, { srcField: v })} />
              <Input value={m.tgtField} placeholder="tgtField" mono
                className={cn(rowErr(i, "tgtField") && "input-invalid")}
                onValue={(v) => update(i, { tgtField: v })} />
              <Input value={m.transformRule ?? ""} placeholder="(없음)" mono
                onValue={(v) => update(i, { transformRule: v || null })} />
              <div className="flex gap-0.5 pt-0.5">
                <button className={iconBtn} title="위로" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                <button className={iconBtn} title="아래로" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                <button className={cn(iconBtn, "hover:text-danger")} title="삭제" onClick={() => remove(i)}><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-fg-muted">{RULE_HELP}</p>

      {rows.length > 0 && (
        <div className="mt-6">
          <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">변환 미리보기</span>
          {srcFields.length > 0 && (
            <div className="mt-2 mb-3 flex flex-wrap gap-3">
              {srcFields.map((f) => (
                <label key={f} className="text-xs text-fg-muted">
                  <span className="font-mono">{f}</span>
                  <input value={sample[f] ?? ""} placeholder={`<${f}>`}
                    onChange={(e) => setSample({ ...sample, [f]: e.target.value })}
                    className="ml-1.5 w-28 rounded border border-border bg-surface px-2 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent/40" />
                </label>
              ))}
            </div>
          )}
          <CodeBox code={`${JSON.stringify(previewSrc)}\n  ▼\n${JSON.stringify(previewTgt)}`} />
          <p className="mt-2 text-xs text-fg-muted">로컬 계산 결과입니다. DATEFMT/CODEMAP의 정확한 변환은 저장 후 시험실행(백엔드)에서 확인하세요.</p>
        </div>
      )}
    </Card>
  );
}
