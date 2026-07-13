import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ArrowUp, ArrowDown, X, Plus, Ban } from "lucide-react";
import { codeMapApi } from "../api/codemap";
import { ApiError } from "../api/client";
import type { CodeMapEntry } from "../types";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Banner } from "../components/ui/Banner";
import { cn } from "../lib/cn";

interface FieldError { field: string; message: string; }

export default function CodeMapEditor() {
  const { groupId = "" } = useParams();
  const nav = useNavigate();
  const [rows, setRows] = useState<CodeMapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    codeMapApi.listByGroup(groupId)
      .then(setRows)
      .catch((e) => setLoadErr(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [groupId]);

  const rowErr = (i: number, f: string) => errors.some((e) => e.field === `entries[${i}].${f}`);

  const set = (next: CodeMapEntry[]) => setRows(next);
  const update = (i: number, patch: Partial<CodeMapEntry>) => set(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => set([...rows, { srcCode: "", tgtCode: "", description: null }]);
  const remove = (i: number) => set(rows.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= rows.length) return;
    const next = [...rows]; [next[i], next[j]] = [next[j], next[i]]; set(next);
  };

  async function save() {
    setSaveErr(null); setErrors([]); setSaved(false);
    setSaving(true);
    try {
      const result = await codeMapApi.saveGroup(groupId, rows);
      setRows(result);
      setSaved(true);
    } catch (e: any) {
      if (e instanceof ApiError && Array.isArray((e.details as any)?.errors)) {
        setErrors((e.details as any).errors);
      }
      setSaveErr(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!confirm(`${groupId} 코드매핑 그룹 전체를 삭제할까요? (되돌릴 수 없습니다)`)) return;
    try {
      await codeMapApi.deleteGroup(groupId);
      nav("/code-maps");
    } catch (e: any) {
      alert("삭제 실패: " + (e.message ?? e));
    }
  }

  const iconBtn = "grid h-8 w-8 place-items-center rounded-md text-fg-subtle hover:bg-muted hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition-colors";

  if (loading) return <p className="text-sm text-fg-muted">불러오는 중…</p>;
  if (loadErr) return <Banner tone="danger" title="불러오기 실패" description={loadErr} />;

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs text-fg-muted">
            <button className="hover:text-fg" onClick={() => nav("/code-maps")}>코드매핑</button>
            <ChevronRight className="h-3 w-3" />
            <span className="font-mono text-fg">{groupId}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight truncate">{groupId}</h1>
          <p className="mt-1 text-xs text-fg-muted">
            필드매핑에서 <span className="font-mono">CODEMAP:{groupId}</span> 룰로 참조합니다
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 pt-1">
          <Button variant="ghost" onClick={doDelete}><Ban className="h-4 w-4" />그룹 삭제</Button>
          <Button variant="ghost" onClick={() => nav("/code-maps")}>목록으로</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? "저장 중…" : "저장"}</Button>
        </div>
      </header>

      {saved && <Banner tone="ok" title="저장했습니다" />}
      {saveErr && <Banner tone="danger" title="저장 실패" description={saveErr} />}

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">코드 매핑 항목</span>
          <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5" />행 추가</Button>
        </div>

        <div className="grid grid-cols-[32px_1fr_1fr_1.4fr_108px] gap-2 px-1 pb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
          <span>#</span><span>소스코드</span><span>타겟코드</span><span>설명</span><span />
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-fg-muted">항목이 없습니다. [행 추가]로 시작하세요.</div>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[32px_1fr_1fr_1.4fr_108px] gap-2 items-start">
                <div className="pt-2 text-center text-xs text-fg-subtle tabular-nums">{i + 1}</div>
                <Input value={r.srcCode} placeholder="SRC_CODE" mono
                  className={cn(rowErr(i, "srcCode") && "input-invalid")}
                  onValue={(v) => update(i, { srcCode: v })} />
                <Input value={r.tgtCode} placeholder="TGT_CODE" mono
                  className={cn(rowErr(i, "tgtCode") && "input-invalid")}
                  onValue={(v) => update(i, { tgtCode: v })} />
                <Input value={r.description ?? ""} placeholder="(선택) 설명"
                  onValue={(v) => update(i, { description: v || null })} />
                <div className="flex gap-0.5 pt-0.5">
                  <button className={iconBtn} title="위로" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                  <button className={iconBtn} title="아래로" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                  <button className={cn(iconBtn, "hover:text-danger")} title="삭제" onClick={() => remove(i)}><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-fg-muted">소스코드는 그룹 안에서 유일해야 합니다. 매핑에 없는 코드는 원본값을 그대로 유지합니다.</p>
      </Card>
    </div>
  );
}
