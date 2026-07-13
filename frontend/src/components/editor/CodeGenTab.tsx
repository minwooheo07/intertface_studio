import { useState } from "react";
import { Code2, Download, Loader2, FileCode } from "lucide-react";
import type { EditorModel } from "../../validation";
import type { CodeGenKind, CodeGenResult } from "../../types";
import { codegenApi } from "../../api/interfaces";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Banner } from "../ui/Banner";
import { CodeBox } from "../ui/CodeBox";
import { cn } from "../../lib/cn";

interface Props { model: EditorModel; }

const KINDS: { value: CodeGenKind; label: string; desc: string }[] = [
  { value: "INTEGRATION", label: "연동 코드", desc: "이 인터페이스와 동일하게 동작하는 코드. 엔진 없이 앱 안에서 직접 실행합니다." },
  { value: "CRUD", label: "CRUD 스캐폴드", desc: "소스 테이블 기준 Controller/Service/DAO/VO 한 벌. 업무 화면 기본 골격입니다." },
];

function toDetail(m: EditorModel) {
  const { mappings, ...master } = m;
  return {
    master: { ...master, srcConfig: master.srcConfig || "{}", tgtConfig: master.tgtConfig || "{}" },
    mappings: mappings.map((mp, i) => ({ ...mp, sortOrder: i + 1 })),
  };
}

export default function CodeGenTab({ model }: Props) {
  const [kind, setKind] = useState<CodeGenKind>("INTEGRATION");
  const [basePackage, setBasePackage] = useState("com.example.generated");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [files, setFiles] = useState<CodeGenResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const req = () => ({
    definition: toDetail(model) as any,
    kind, framework: "spring", basePackage,
  });

  async function preview() {
    setLoading(true); setErr(null); setFiles(null); setSelected(null);
    try {
      const res = await codegenApi.preview(req());
      setFiles(res);
      setSelected(Object.keys(res)[0] ?? null);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function download() {
    setErr(null);
    try {
      const res = await fetch(codegenApi.downloadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req()),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ message: "다운로드 실패" }));
        throw new Error(msg.message ?? "다운로드 실패");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(model.ifId || "generated").toLowerCase()}-${kind.toLowerCase()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-6 space-y-5">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">생성 종류</span>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {KINDS.map((k) => (
              <button key={k.value} onClick={() => setKind(k.value)}
                className={cn("rounded-xl border p-4 text-left transition-all",
                  kind === k.value
                    ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                    : "border-border hover:bg-muted/60")}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Code2 className={cn("h-4 w-4", kind === k.value ? "text-accent" : "text-fg-subtle")} />
                  {k.label}
                </div>
                <p className="mt-1 text-xs text-fg-muted">{k.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Input label="베이스 패키지" mono value={basePackage} onValue={setBasePackage}
          hint="생성 코드의 package 경로. 사내 표준 패키지 규약에 맞추세요." />

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={preview} disabled={loading || model.srcType !== "DB"}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
            {loading ? "생성 중…" : "미리보기"}
          </Button>
          {files && (
            <Button onClick={download}><Download className="h-4 w-4" />zip 다운로드</Button>
          )}
        </div>

        {model.srcType !== "DB" && (
          <Banner tone="info" title={`${model.srcType} 소스는 코드 생성 미지원`}
            description="소스 컬럼 정보를 읽어야 VO를 만들 수 있어 현재 DB 소스만 지원합니다." />
        )}
        {err && <Banner tone="danger" title="코드 생성 실패" description={err} />}

        <Banner tone="warn" title="생성된 코드는 시작점입니다"
          description="트랜잭션 경계·에러 처리·재시도 정책은 업무 요건에 맞게 검토·보완하세요. 코드 안에 TODO로 표시해 두었습니다." />
      </Card>

      {files && (
        <Card className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
              생성 결과 ({Object.keys(files).length}개 파일)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
            {/* 파일 목록 */}
            <div className="space-y-1">
              {Object.keys(files).map((path) => {
                const name = path.split("/").pop();
                return (
                  <button key={path} onClick={() => setSelected(path)}
                    className={cn("w-full rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      selected === path ? "bg-accent/10 text-accent font-semibold" : "hover:bg-muted text-fg-muted")}>
                    <div className="font-mono truncate">{name}</div>
                    <div className="truncate text-[10px] opacity-60">{path}</div>
                  </button>
                );
              })}
            </div>
            {/* 코드 */}
            <div className="min-w-0">
              {selected && <CodeBox code={files[selected]} className="max-h-[560px]" />}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
