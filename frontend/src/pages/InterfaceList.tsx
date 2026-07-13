import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import { interfacesApi } from "../api/interfaces";
import type { InterfaceSummary } from "../types";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Banner } from "../components/ui/Banner";
import { Pipe } from "../components/ui/Pipe";

export default function InterfaceList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<InterfaceSummary[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interfacesApi.list().then(setRows).catch((e) => setErr(String(e.message ?? e))).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">인터페이스</h1>
          <p className="text-sm text-fg-muted mt-0.5">시스템 간 연동 정의를 관리합니다</p>
        </div>
        <Button variant="primary" onClick={() => nav("/interfaces/new")}>
          <Plus className="h-4 w-4" />신규 등록
        </Button>
      </header>

      {err && <Banner tone="danger" title="불러오기 실패" description={err} />}

      {loading ? (
        <p className="text-sm text-fg-muted">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <Banner tone="info" title="등록된 인터페이스가 없습니다"
          description="우측 상단 [신규 등록]으로 첫 인터페이스를 만들어보세요." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <th className="px-5 py-3.5 font-semibold">IF ID</th>
                <th className="px-5 py-3.5 font-semibold">이름</th>
                <th className="px-5 py-3.5 font-semibold">흐름</th>
                <th className="px-5 py-3.5 font-semibold">주기</th>
                <th className="px-5 py-3.5 font-semibold">최근</th>
                <th className="px-5 py-3.5 font-semibold">사용</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ifId} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs">{r.ifId}</td>
                  <td className="px-5 py-3.5 font-semibold">{r.ifName}</td>
                  <td className="px-5 py-3.5">
                    <Pipe src={r.srcSystem} tgt={r.tgtSystem} live={r.lastStatus === "SUCCESS" && r.useYn === "Y"} />
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-fg-muted">{r.cronExpr ?? "수동"}</td>
                  <td className="px-5 py-3.5">
                    {r.lastStatus === "FAIL"
                      ? <Badge tone="danger">실패</Badge>
                      : <span className="text-fg-muted text-xs">{r.lastStatus === "SUCCESS" ? "성공" : r.lastStatus === "SKIP" ? "스킵" : "—"}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.useYn === "N" ? <Badge tone="muted">중지</Badge> : <span className="text-fg-muted text-xs">사용</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => nav(`/interfaces/${r.ifId}`)}>
                      <Pencil className="h-3.5 w-3.5" />편집
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
