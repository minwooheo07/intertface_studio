import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Loader2, Plus, X, Clock, AlertTriangle, ArrowRightCircle } from "lucide-react";
import { httpTestApi } from "../api/interfaces";
import type { HttpTestResponse } from "../types";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Banner } from "../components/ui/Banner";
import { CodeBox } from "../components/ui/CodeBox";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { cn } from "../lib/cn";
import { parseBodyKeys, convertToTargetConfig, type BodyKey, type KeyRole } from "./apiTesterConvert";

type BodyType = "NONE" | "JSON" | "FORM" | "RAW";
const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const BODY_TYPES: BodyType[] = ["NONE", "JSON", "FORM", "RAW"];

interface HeaderRow { key: string; value: string; }

function prettyBody(body: string | null): string {
  if (!body) return "(빈 응답)";
  try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
}

export default function ApiTester() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [bodyType, setBodyType] = useState<BodyType>("NONE");
  const [body, setBody] = useState("");
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState<HttpTestResponse | null>(null);
  const [respTab, setRespTab] = useState<"body" | "headers">("body");

  // 인터페이스 타겟 설정으로 가져오기
  const nav = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const [bodyKeys, setBodyKeys] = useState<BodyKey[]>([]);

  function openImport() {
    setBodyKeys(parseBodyKeys(bodyType, body));
    setImportOpen(true);
  }
  function doImport() {
    const headerMap: Record<string, string> = {};
    headers.forEach((h) => { if (h.key.trim()) headerMap[h.key.trim()] = h.value; });
    const result = convertToTargetConfig(
      { url, method, headers: headerMap, bodyType, body },
      bodyKeys
    );
    // 편집기로 넘긴다. URL 쿼리가 아닌 router state로 → 시크릿이 주소창에 남지 않음
    nav("/interfaces/new", { state: { fromApiTester: result } });
  }
  const ROLE_LABELS: Record<KeyRole, string> = {
    MAPPING: "매핑", CONST: "고정값", AUTH: "인증", SKIP: "제외",
  };

  const setHeader = (i: number, patch: Partial<HeaderRow>) =>
    setHeaders(headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  async function send() {
    setRunning(true); setRes(null);
    try {
      const headerMap: Record<string, string> = {};
      headers.forEach((h) => { if (h.key.trim()) headerMap[h.key.trim()] = h.value; });
      const r = await httpTestApi.run({
        url, method, headers: headerMap, bodyType,
        body: bodyType === "NONE" ? undefined : body,
      });
      setRes(r);
    } catch (e: any) {
      setRes({ status: 0, statusText: "", durationMs: 0, headers: null, body: null, bodyTruncated: false, error: e.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  }

  const statusTone = res && res.status >= 200 && res.status < 300 ? "ok"
    : res && res.status >= 400 ? "danger" : "muted";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">API 테스트</h1>
        <p className="text-sm text-fg-muted mt-0.5">업체 API를 인터페이스 정의 전에 직접 호출해봅니다. 연계서버가 접근 가능한 사내망 API도 테스트됩니다.</p>
      </header>

      <Banner tone="warn" title="실제 호출입니다"
        description="시험실행과 달리 dryRun이 없습니다. 전송 버튼을 누르면 진짜 요청이 나갑니다. 운영 API에 POST/PUT/DELETE를 보낼 때 주의하세요." />

      {/* 요청 */}
      <Card className="p-6 space-y-5">
        <div className="flex gap-2">
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="input w-28 font-mono font-semibold text-center appearance-none cursor-pointer">
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.daouoffice.com/..."
            className="input font-mono flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
          <Button variant="primary" onClick={send} disabled={running || !url.trim()}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {running ? "전송 중…" : "전송"}
          </Button>
        </div>

        {/* 헤더 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">헤더</span>
            <Button size="sm" variant="ghost" onClick={() => setHeaders([...headers, { key: "", value: "" }])}>
              <Plus className="h-3.5 w-3.5" />추가
            </Button>
          </div>
          {headers.length === 0
            ? <p className="text-xs text-fg-muted">헤더 없음. 인증 토큰 등이 필요하면 [추가]를 누르세요.</p>
            : (
              <div className="space-y-1.5">
                {headers.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={h.key} placeholder="Authorization" onChange={(e) => setHeader(i, { key: e.target.value })}
                      className="input input-mono w-1/3" />
                    <input value={h.value} placeholder="Bearer ..." onChange={(e) => setHeader(i, { value: e.target.value })}
                      className="input input-mono flex-1" />
                    <button className="icon-btn danger" onClick={() => setHeaders(headers.filter((_, idx) => idx !== i))}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* 바디 */}
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">바디</span>
            <div className="inline-flex gap-1 rounded-[10px] bg-fg/[0.05] p-0.5">
              {BODY_TYPES.map((t) => (
                <button key={t} onClick={() => setBodyType(t)}
                  className={cn("rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-all",
                    bodyType === t ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {bodyType !== "NONE" && (
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} spellCheck={false}
              placeholder={bodyType === "JSON" ? '{\n  "key": "value"\n}' : bodyType === "FORM" ? "key=value&key2=value2" : "raw body"}
              className="input input-mono resize-y" />
          )}
        </div>
      </Card>

      {/* 응답 */}
      {res && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">응답</span>
            {res.error ? (
              <Badge tone="danger"><AlertTriangle className="h-3 w-3" />전송 실패</Badge>
            ) : (
              <>
                <Badge tone={statusTone as any}>{res.status} {res.statusText}</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                  <Clock className="h-3.5 w-3.5" />{res.durationMs}ms
                </span>
              </>
            )}
            {!res.error && res.status >= 200 && res.status < 300 && (
              <span className="ml-auto">
                <Button size="sm" onClick={openImport}>
                  <ArrowRightCircle className="h-3.5 w-3.5" />인터페이스로 가져오기
                </Button>
              </span>
            )}
          </div>

          {res.error ? (
            <Banner tone="danger" title="요청을 보내지 못했습니다" description={res.error} />
          ) : (
            <>
              <div className="inline-flex gap-1 rounded-[10px] bg-fg/[0.05] p-0.5">
                {(["body", "headers"] as const).map((t) => (
                  <button key={t} onClick={() => setRespTab(t)}
                    className={cn("rounded-[8px] px-3 py-1 text-xs font-semibold transition-all",
                      respTab === t ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}>
                    {t === "body" ? "바디" : "헤더"}
                  </button>
                ))}
              </div>
              {res.bodyTruncated && (
                <Banner tone="warn" title="응답이 1MB를 초과해 잘렸습니다" />
              )}
              {respTab === "body"
                ? <CodeBox code={prettyBody(res.body)} className="max-h-[480px]" />
                : <CodeBox code={res.headers ? Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`).join("\n") : "(없음)"} className="max-h-[480px]" />}
            </>
          )}
        </Card>
      )}

      {/* 인터페이스로 가져오기: 바디 키의 역할 지정 */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="인터페이스 타겟 설정으로 가져오기"
        description="테스트한 요청을 인터페이스 정의로 옮깁니다. 바디의 각 필드가 매번 소스에서 채워질 값인지, 고정값인지 정해주세요."
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>취소</Button>
            <Button variant="primary" onClick={doImport}>편집기로 이동</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-muted/60 p-3 font-mono text-xs">
            <span className="font-semibold">{method}</span> {url}
          </div>

          {bodyKeys.length === 0 ? (
            <Banner tone="warn" title="바디 필드를 분해하지 못했습니다"
              description={bodyType === "NONE" || bodyType === "RAW"
                ? "NONE/RAW 바디는 키 단위로 나눌 수 없습니다. URL·메서드·헤더만 가져옵니다."
                : "바디 형식을 확인하세요. URL·메서드·헤더만 가져옵니다."} />
          ) : (
            <div>
              <div className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <span>필드</span><span>테스트 값</span><span>역할</span>
              </div>
              <div className="space-y-1.5">
                {bodyKeys.map((bk, i) => (
                  <div key={bk.key} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                    <span className="font-mono text-sm font-medium">{bk.key}</span>
                    <span className="truncate font-mono text-xs text-fg-muted">{bk.value}</span>
                    <div className="inline-flex gap-0.5 rounded-[10px] bg-fg/[0.05] p-0.5">
                      {(["MAPPING", "CONST", "AUTH", "SKIP"] as KeyRole[]).map((r) => (
                        <button key={r}
                          onClick={() => setBodyKeys(bodyKeys.map((x, idx) => idx === i ? { ...x, role: r } : x))}
                          className={cn("rounded-[8px] px-2 py-1 text-xs font-semibold transition-all",
                            bk.role === r ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}>
                          {ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-xs text-fg-muted">
                <p><b>매핑</b> — 소스 데이터에서 매번 채워질 값. 필드매핑 탭에 타겟필드로 생성됩니다.</p>
                <p><b>고정값</b> — 매번 같은 값. constParams로 들어갑니다.</p>
                <p><b>인증</b> — 시크릿. 실제 값 대신 환경변수 참조(${"{...}"})로 저장됩니다.</p>
              </div>
            </div>
          )}

          <Banner tone="info" title="안전을 위해 dryRun이 켜집니다"
            description="가져온 직후에는 실제 전송하지 않습니다. 검증 후 타겟 탭에서 끄세요." />
        </div>
      </Modal>
    </div>
  );
}
