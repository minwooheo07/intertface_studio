import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import { codeMapApi } from "../api/codemap";
import type { CodeMapGroup } from "../types";
import { Button } from "../components/ui/Button";
import { Banner } from "../components/ui/Banner";

const GROUP_ID_RE = /^[A-Z0-9_]{1,30}$/;

export default function CodeMapList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<CodeMapGroup[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    codeMapApi.listGroups().then(setRows).catch((e) => setErr(String(e.message ?? e))).finally(() => setLoading(false));
  }, []);

  function createGroup() {
    const id = prompt("새 그룹ID (영문 대문자·숫자·밑줄, 예: ACCT_CD):");
    if (!id) return;
    const groupId = id.trim().toUpperCase();
    if (!GROUP_ID_RE.test(groupId)) {
      alert("그룹ID는 영문 대문자·숫자·밑줄 1~30자만 허용됩니다.");
      return;
    }
    nav(`/code-maps/${groupId}`);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">코드매핑</h1>
          <p className="text-sm text-fg-muted mt-0.5">필드매핑의 CODEMAP:그룹ID 룰이 참조하는 소스코드→타겟코드 변환표입니다</p>
        </div>
        <Button variant="primary" onClick={createGroup}>
          <Plus className="h-4 w-4" />새 그룹
        </Button>
      </header>

      {err && <Banner tone="danger" title="불러오기 실패" description={err} />}

      {loading ? (
        <p className="text-sm text-fg-muted">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <Banner tone="info" title="등록된 코드매핑 그룹이 없습니다"
          description="우측 상단 [새 그룹]으로 첫 코드매핑 그룹을 만들어보세요." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                <th className="px-5 py-3.5 font-semibold">그룹ID</th>
                <th className="px-5 py-3.5 font-semibold">항목 수</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.groupId} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs">{g.groupId}</td>
                  <td className="px-5 py-3.5 text-fg-muted">{g.count}개</td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => nav(`/code-maps/${g.groupId}`)}>
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
