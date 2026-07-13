import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Copy, Ban } from "lucide-react";
import { interfacesApi } from "../api/interfaces";
import type { InterfaceDetail } from "../types";
import { validate, totalErrors } from "../validation";
import type { EditorModel } from "../validation";
import { Pipe } from "../components/ui/Pipe";
import { Button } from "../components/ui/Button";
import { Banner } from "../components/ui/Banner";
import { Tabs, TabPanel } from "../components/ui/Tabs";
import { IconButton } from "../components/ui/IconButton";
import BasicTab from "../components/editor/BasicTab";
import SourceTab from "../components/editor/SourceTab";
import TargetTab from "../components/editor/TargetTab";
import MappingTab from "../components/editor/MappingTab";
import TestTab from "../components/editor/TestTab";
import CodeGenTab from "../components/editor/CodeGenTab";

type TabKey = "basic" | "source" | "target" | "mapping" | "test" | "codegen";

function emptyModel(): EditorModel {
  return {
    ifId: "", ifName: "", srcSystem: "", tgtSystem: "", srcType: "DB", tgtType: "DB",
    srcConfig: "{}", tgtConfig: "{}", cronExpr: null, dupKeyCols: null, useYn: "Y", description: null, mappings: [],
  };
}
function toModel(d: InterfaceDetail): EditorModel {
  return { ...d.master, mappings: d.mappings.map((m) => ({ ...m })) };
}
function toDetail(m: EditorModel): InterfaceDetail {
  const { mappings, ...master } = m;
  return {
    master: { ...master, srcConfig: master.srcConfig?.trim() ? master.srcConfig : "{}", tgtConfig: master.tgtConfig?.trim() ? master.tgtConfig : "{}" },
    mappings: mappings.map((mp, i) => ({ ...mp, sortOrder: i + 1 })),
  };
}

export default function InterfaceEditor({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  // API 테스터에서 "인터페이스로 가져오기"로 넘어온 경우 초기값을 채운다
  const imported = (loc.state as any)?.fromApiTester as
    | { tgtConfig: string; mappingTargets: string[]; warnings: string[] }
    | undefined;
  const [model, setModel] = useState<EditorModel>(() => {
    if (mode === "create" && imported) {
      return {
        ...emptyModel(),
        tgtType: "REST",
        tgtConfig: imported.tgtConfig,
        mappings: imported.mappingTargets.map((t, i) => ({
          srcField: "", tgtField: t, transformRule: null, sortOrder: i + 1,
        })),
      };
    }
    return emptyModel();
  });
  const [tab, setTab] = useState<TabKey>("basic");
  const [loading, setLoading] = useState(mode === "edit");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      interfacesApi.get(id).then((d) => setModel(toModel(d)))
        .catch((e) => setLoadErr(e.message ?? String(e))).finally(() => setLoading(false));
    }
  }, [mode, id]);

  const errors = useMemo(() => validate(model, mode), [model, mode]);
  const errCount = totalErrors(errors);
  const patch = (p: Partial<EditorModel>) => setModel((m) => ({ ...m, ...p }));
  const tabErr: Record<TabKey, number> = {
    basic: errors.basic.length, source: errors.source.length, target: errors.target.length, mapping: errors.mapping.length, test: 0, codegen: 0,
  };

  async function save() {
    setShowErrors(true); setSaveErr(null);
    if (errCount > 0) {
      const bad = (["basic", "source", "target", "mapping"] as TabKey[]).find((t) => tabErr[t] > 0);
      if (bad) setTab(bad);
      return;
    }
    setSaving(true);
    try {
      const d = toDetail(model);
      if (mode === "create") await interfacesApi.create(d);
      else await interfacesApi.update(model.ifId, d);
      nav("/interfaces");
    } catch (e: any) { setSaveErr(e.message ?? String(e)); }
    finally { setSaving(false); }
  }
  async function doClone() {
    const newId = prompt("복제할 새 IF ID (영문 대문자·숫자·밑줄):", model.ifId + "_COPY");
    if (!newId) return;
    const newName = prompt("새 이름:", model.ifName + " (복제)") ?? model.ifName;
    try { await interfacesApi.clone(model.ifId, newId.toUpperCase(), newName); nav(`/interfaces/${newId.toUpperCase()}`); }
    catch (e: any) { alert("복제 실패: " + (e.message ?? e)); }
  }
  async function doDelete() {
    if (!confirm(`${model.ifId} 인터페이스를 중지(비활성)할까요?`)) return;
    try { await interfacesApi.remove(model.ifId); nav("/interfaces"); }
    catch (e: any) { alert("삭제 실패: " + (e.message ?? e)); }
  }

  if (loading) return <p className="text-sm text-fg-muted">불러오는 중…</p>;
  if (loadErr) return <Banner tone="danger" title="불러오기 실패" description={loadErr} />;

  const tabs = [
    { value: "basic", label: "기본정보", hasError: showErrors && tabErr.basic > 0 },
    { value: "source", label: "소스", hasError: showErrors && tabErr.source > 0 },
    { value: "target", label: "타겟", hasError: showErrors && tabErr.target > 0 },
    { value: "mapping", label: "필드매핑", hasError: showErrors && tabErr.mapping > 0 },
    { value: "test", label: "테스트", hasError: false },
    { value: "codegen", label: "코드생성", hasError: false },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs text-fg-muted">
            <button className="hover:text-fg" onClick={() => nav("/interfaces")}>인터페이스</button>
            <ChevronRight className="h-3 w-3" />
            <span className="font-mono text-fg">{mode === "create" ? "신규" : model.ifId}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight truncate">
            {mode === "create" ? "인터페이스 신규 등록" : (model.ifName || model.ifId)}
          </h1>
        </div>
        <div className="hidden sm:block pt-6"><Pipe src={model.srcSystem || "소스"} tgt={model.tgtSystem || "타겟"} /></div>
        <div className="ml-auto flex items-center gap-1.5 pt-4">
          {mode === "edit" && (
            <>
              <IconButton icon={<Copy className="h-[17px] w-[17px]" />} label="복제" onClick={doClone} />
              <IconButton icon={<Ban className="h-[17px] w-[17px]" />} label="중지" danger onClick={doDelete} />
              <span className="mx-1 h-5 w-px bg-border" />
            </>
          )}
          <Button variant="ghost" onClick={() => nav("/interfaces")}>취소</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? "저장 중…" : "저장"}</Button>
        </div>
      </header>

      {imported && (
        <Banner tone="ok" title="API 테스터에서 가져왔습니다"
          description={
            (imported.mappingTargets.length > 0
              ? `타겟 설정과 매핑 타겟필드 ${imported.mappingTargets.length}개를 채웠습니다. 필드매핑 탭에서 각 타겟필드에 대응할 소스필드를 지정하세요. `
              : "타겟 설정을 채웠습니다. ") + imported.warnings.join(" ")
          } />
      )}
      {saveErr && <Banner tone="danger" title="저장 실패" description={saveErr} />}
      {showErrors && errCount > 0 && (
        <Banner tone="danger" title={`입력값을 확인해주세요 (${errCount}건)`}
          description={Object.values(errors).flat().slice(0, 6).map((e) => e.message).join(" · ")} />
      )}

      <Tabs value={tab} onValue={(v) => setTab(v as TabKey)} tabs={tabs}>
        <TabPanel value="basic"><BasicTab model={model} mode={mode} errors={errors.basic} onChange={patch} /></TabPanel>
        <TabPanel value="source"><SourceTab model={model} errors={errors.source} onChange={patch} /></TabPanel>
        <TabPanel value="target"><TargetTab model={model} errors={errors.target} onChange={patch} /></TabPanel>
        <TabPanel value="mapping"><MappingTab model={model} errors={errors.mapping} onChange={patch} /></TabPanel>
        <TabPanel value="test"><TestTab model={model} /></TabPanel>
        <TabPanel value="codegen"><CodeGenTab model={model} /></TabPanel>
      </Tabs>
    </div>
  );
}
