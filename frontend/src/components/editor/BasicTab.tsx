import type { ChannelType } from "../../types";
import type { EditorModel, FieldError } from "../../validation";
import { cronError } from "../../validation";
import { Input, TextArea } from "../ui/Input";
import { Select } from "../ui/Select";
import { Card } from "../ui/Card";

interface Props {
  model: EditorModel; mode: "create" | "edit"; errors: FieldError[];
  onChange: (patch: Partial<EditorModel>) => void;
}
const CHANNELS: ChannelType[] = ["DB", "REST", "FILE", "SOCKET"];

export default function BasicTab({ model, mode, errors, onChange }: Props) {
  const err = (f: string) => errors.find((e) => e.field === f)?.message;
  const cronMsg = cronError(model.cronExpr);
  return (
    <Card className="p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input label="IF ID" required mono value={model.ifId} disabled={mode === "edit"}
          error={err("ifId")}
          hint={mode === "edit" ? "등록 후 변경 불가" : "영문 대문자·숫자·밑줄 (예: DZ_AR_001)"}
          onValue={(v) => onChange({ ifId: v.toUpperCase() })} />
        <Input label="이름" required value={model.ifName} placeholder="빌링→ERP 매출전표"
          error={err("ifName")} onValue={(v) => onChange({ ifName: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input label="소스 시스템" value={model.srcSystem} placeholder="BILLING"
          onValue={(v) => onChange({ srcSystem: v.toUpperCase() })} />
        <Input label="타겟 시스템" value={model.tgtSystem} placeholder="DOUZONE"
          onValue={(v) => onChange({ tgtSystem: v.toUpperCase() })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Select label="소스 채널유형" options={CHANNELS} value={model.srcType}
          onValue={(v) => onChange({ srcType: v as ChannelType })} />
        <Select label="타겟 채널유형" options={CHANNELS} value={model.tgtType}
          onValue={(v) => onChange({ tgtType: v as ChannelType })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Input label="주기 (cron)" mono value={model.cronExpr ?? ""} placeholder="0 * * * * ?"
          error={err("cronExpr")}
          hint={model.cronExpr && !cronMsg ? "유효 · 비우면 수동 실행" : "Quartz cron. 비우면 수동 실행"}
          onValue={(v) => onChange({ cronExpr: v || null })} />
        <Input label="중복방지 키" mono value={model.dupKeyCols ?? ""} placeholder="BILL_NO"
          hint="소스필드명. 콤마로 복합키" onValue={(v) => onChange({ dupKeyCols: v || null })} />
        <Select label="사용 여부" value={model.useYn}
          options={[{ value: "Y", label: "사용 (Y)" }, { value: "N", label: "중지 (N)" }]}
          onValue={(v) => onChange({ useYn: v as "Y" | "N" })} />
      </div>
      <TextArea label="설명" value={model.description ?? ""} rows={2}
        onValue={(v) => onChange({ description: v || null })} />
    </Card>
  );
}
