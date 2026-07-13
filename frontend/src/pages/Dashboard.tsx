import { useEffect, useState, lazy, Suspense } from "react";
import { RefreshCw, TrendingUp, XOctagon, SkipForward } from "lucide-react";
import { dashboardApi, type DashboardSummary } from "../api/interfaces";
import { Button } from "../components/ui/Button";
import { Banner } from "../components/ui/Banner";
import { useTheme } from "../hooks/useTheme";
// three.js는 무겁다(약 250KB gzip). 대시보드에서만 쓰므로 지연 로드해
// 다른 화면(편집기·API테스터 등)의 초기 로딩에 부담을 주지 않는다.
const FlowScene = lazy(() => import("../components/dashboard/FlowScene"));

function Stat({ label, value, Icon, tone }: {
  label: string; value: number; Icon: typeof TrendingUp; tone: "ok" | "danger" | "muted";
}) {
  const color = tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-fg-muted";
  const ring = tone === "ok" ? "bg-ok/10" : tone === "danger" ? "bg-danger/10" : "bg-fg/10";
  return (
    <div className="rounded-2xl bg-surface/70 backdrop-blur-xl p-4 flex items-center gap-3 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${ring} ${color}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <div className="text-xs text-fg-muted">{label}</div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [s, setS] = useState<DashboardSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { mode } = useTheme();
  const load = () => dashboardApi.summary().then(setS).catch((e) => setErr(String(e.message ?? e)));
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">대시보드</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            {s ? `갱신 ${s.asOf?.replace("T", " ").slice(5, 19)}` : "인터페이스 관제 현황"}
          </p>
        </div>
        <Button onClick={load}><RefreshCw className="h-4 w-4" />새로고침</Button>
      </header>

      {err && <Banner tone="danger" title="현황 조회 실패" description={err} />}

      {/* 3D 히어로: 소스 → 엔진 → 타겟 데이터 흐름 */}
      <div className="relative h-[420px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/40 to-violet-50/50 dark:from-[#0b0b0f] dark:via-[#0d1220] dark:to-[#140d1f] shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <Suspense fallback={
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-2 text-xs text-fg-subtle">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              흐름 시각화 준비 중…
            </div>
          </div>
        }>
          {/* key에 테마를 넣어 전환 시 씬을 재생성한다 (블렌딩 모드는 초기화 때 정해지므로) */}
          <FlowScene key={mode} success={s?.success ?? 0} fail={s?.fail ?? 0} dark={mode === "dark"} />
        </Suspense>

        {/* 라벨 오버레이 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-8">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent/70">Source</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-500/70">Target</span>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-subtle">IF Engine</div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
            </span>
            실시간 흐름
          </div>
        </div>

        {/* 통계 카드 오버레이 (글래스) */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="오늘 성공" value={s?.success ?? 0} Icon={TrendingUp} tone="ok" />
            <Stat label="오늘 실패" value={s?.fail ?? 0} Icon={XOctagon} tone="danger" />
            <Stat label="오늘 스킵 (중복)" value={s?.skip ?? 0} Icon={SkipForward} tone="muted" />
          </div>
        </div>
      </div>

      <Banner tone="info" title="실행이력 · 장애 큐"
        description="건별 로그 조회와 실패 재처리는 실행이력 화면에서 다룹니다 (이관 예정). 지금은 인터페이스 메뉴에서 정의를 관리하세요." />
    </div>
  );
}
