import { useState } from "react";
import type { ChannelType } from "../../types";
import { Input, TextArea } from "../ui/Input";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Banner } from "../ui/Banner";
import { jsonError } from "../../validation";

interface Props {
  side: "source" | "target";
  type: ChannelType;
  value: string;
  onChange: (json: string) => void;
  error?: string;
}

function parse(json: string): Record<string, any> {
  if (!json || !json.trim()) return {};
  try { return JSON.parse(json); } catch { return {}; }
}
function stringify(obj: Record<string, any>): string {
  return JSON.stringify(obj, null, 2);
}

export default function ChannelForm({ side, type, value, onChange, error }: Props) {
  const [raw, setRaw] = useState(false);
  const cfg = parse(value);
  const setField = (key: string, v: any) => {
    const next = { ...cfg };
    if (v === "" || v == null) delete next[key];
    else next[key] = v;
    onChange(stringify(next));
  };

  const Header = (
    <div className="mb-4 flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {side === "source" ? "소스" : "타겟"} 설정 · {type}
      </span>
      <Switch checked={raw} onChange={setRaw} label="JSON 원문" />
    </div>
  );

  if (raw) {
    const je = jsonError(value);
    return (
      <div>
        {Header}
        <TextArea label="Config JSON" mono rows={12} value={value} error={je ?? undefined}
          onValue={(v) => onChange(v)} spellCheck={false} />
      </div>
    );
  }

  return (
    <div>
      {Header}
      <div className="space-y-5">
        {type === "DB" && side === "source" && (
          <>
            <Input label="데이터소스" value={cfg.datasource ?? ""} placeholder="local"
              hint="application.yml의 if-engine.datasources 이름. 엔진 기본 DB는 local"
              onValue={(v) => setField("datasource", v)} />
            <TextArea label="수집 쿼리 (query)" required mono value={cfg.query ?? ""}
              placeholder="SELECT ... FROM IF_TBL WHERE IF_FLAG = 'N'"
              hint="미전송 데이터를 조회하는 SELECT" onValue={(v) => setField("query", v)} />
            <TextArea label="처리표시 쿼리 (markQuery)" mono value={cfg.markQuery ?? ""}
              placeholder="UPDATE IF_TBL SET IF_FLAG='Y' WHERE KEY=:KEY"
              hint="전송 성공 후 소스에 완료표시. :컬럼명 으로 바인딩" onValue={(v) => setField("markQuery", v)} />
          </>
        )}
        {type === "DB" && side === "target" && (
          <>
            <Input label="데이터소스" value={cfg.datasource ?? ""} placeholder="douzone"
              hint="적재 대상 시스템의 데이터소스 이름" onValue={(v) => setField("datasource", v)} />
            <TextArea label="적재 쿼리 (insertQuery)" required mono value={cfg.insertQuery ?? ""}
              placeholder="INSERT INTO TGT (A,B) VALUES (:A,:B)"
              hint=":타겟필드명 으로 바인딩. 이름은 매핑의 타겟필드와 일치" onValue={(v) => setField("insertQuery", v)} />
          </>
        )}
        {type === "REST" && side === "target" && (
          <>
            <Input label="URL" required value={cfg.url ?? ""} placeholder="https://api.daouoffice.com/..."
              hint="다우는 DOAS 서버(api.daouoffice.com). 고객사 URL 아님" onValue={(v) => setField("url", v)} />
            <div className="grid grid-cols-3 gap-4">
              <Select label="메서드" options={["POST", "PUT", "GET"]} value={cfg.method ?? "POST"}
                onValue={(v) => setField("method", v)} />
              <Select label="바디 형식" value={cfg.bodyType ?? "FORM"}
                options={[{ value: "FORM", label: "FORM (urlencoded)" }, { value: "JSON", label: "JSON" }]}
                onValue={(v) => setField("bodyType", v)} />
              <Input label="charset" value={cfg.charset ?? "UTF-8"} onValue={(v) => setField("charset", v)} />
            </div>
            <Switch checked={!!cfg.dryRun} onChange={(on) => setField("dryRun", on ? true : "")}
              label="dryRun · 전송하지 않고 미리보기만"
              hint="켜면 실제 전송 없이 요청 내용만 로그. 인증키 미발급 단계에 사용" />
            <TextArea label="인증 (auth JSON)" mono rows={4}
              value={cfg.auth ? JSON.stringify(cfg.auth, null, 2) : ""}
              placeholder='{"in":"BODY","fields":{"clientId":"secret"}}'
              hint="시크릿은 환경변수 참조로. DB에 평문 저장 금지"
              onValue={(v) => { try { setField("auth", v.trim() ? JSON.parse(v) : ""); } catch { /* 입력 중 무시 */ } }} />
            <TextArea label="고정 파라미터 (constParams JSON)" mono rows={3}
              value={cfg.constParams ? JSON.stringify(cfg.constParams, null, 2) : ""}
              placeholder='{"productName":"OurServiceIF"}'
              onValue={(v) => { try { setField("constParams", v.trim() ? JSON.parse(v) : ""); } catch { /* 무시 */ } }} />
          </>
        )}
        {(type === "FILE" || type === "SOCKET" || (type === "REST" && side === "source")) && (
          <>
            <Banner tone="info" title={`${type} ${side === "source" ? "소스" : "타겟"} 어댑터는 아직 백엔드 미구현`}
              description="설정을 JSON 원문으로 등록해두면 어댑터 구현 후 바로 동작합니다." />
            <TextArea label="Config JSON" mono rows={8} value={value} error={error}
              onValue={(v) => onChange(v)} spellCheck={false} />
          </>
        )}
      </div>
    </div>
  );
}
