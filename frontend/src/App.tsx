import { NavLink, Route, Routes } from "react-router-dom";
import { LayoutDashboard, Workflow, ScrollText, Send, Tags, Moon, Sun } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { LogoSymbol } from "./components/brand/Logo";
import { cn } from "./lib/cn";
import Dashboard from "./pages/Dashboard";
import InterfaceList from "./pages/InterfaceList";
import InterfaceEditor from "./pages/InterfaceEditor";
import LogViewer from "./pages/LogViewer";
import ApiTester from "./pages/ApiTester";
import CodeMapList from "./pages/CodeMapList";
import CodeMapEditor from "./pages/CodeMapEditor";
import { TooltipProvider } from "./components/ui/Tooltip";

// 각 메뉴에 iOS 앱아이콘풍 컬러 (그라데이션)
const NAV = [
  { to: "/", label: "대시보드", Icon: LayoutDashboard, end: true, color: "from-sky-400 to-blue-500" },
  { to: "/interfaces", label: "인터페이스", Icon: Workflow, end: false, color: "from-teal-400 to-emerald-500" },
  { to: "/logs", label: "실행이력", Icon: ScrollText, end: false, color: "from-orange-400 to-amber-500" },
  { to: "/api-tester", label: "API 테스트", Icon: Send, end: false, color: "from-violet-400 to-purple-500" },
  { to: "/code-maps", label: "코드매핑", Icon: Tags, end: false, color: "from-rose-400 to-pink-500" },
];

function Sidebar() {
  const { mode, toggle } = useTheme();
  return (
    <aside className="sidebar-surface fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-sidebar-border text-sidebar-fg">
      {/* 브랜드 */}
      <div className="flex items-center gap-3 px-5 h-[68px]">
        <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-white shadow-md shadow-blue-500/20 ring-1 ring-black/5">
          <LogoSymbol size={30} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Interface Studio</div>
          <div className="text-xs text-sidebar-muted">인터페이스 스튜디오</div>
        </div>
      </div>

      {/* 섹션 라벨 */}
      <div className="px-5 pt-3 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">메뉴</span>
      </div>

      {/* 네비 */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ to, label, Icon, end, color }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => cn(
              "group flex items-center gap-3 rounded-[12px] px-2.5 py-2 text-[15px] font-medium transition-all",
              isActive
                ? "bg-surface shadow-sm shadow-black/5 text-fg"
                : "text-sidebar-fg hover:bg-white/50 dark:hover:bg-white/5"
            )}
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  "nav-icon bg-gradient-to-br transition-transform group-hover:scale-105",
                  color,
                  !isActive && "opacity-90"
                )}>
                  <Icon className="h-[17px] w-[17px]" />
                </span>
                {label}
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 하단: 상태 + 테마 토글 */}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-xs text-sidebar-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
          </span>
          엔진 실행 중
        </div>
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-[15px] font-medium text-sidebar-fg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
        >
          <span className="nav-icon bg-gradient-to-br from-slate-400 to-slate-600">
            {mode === "dark" ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
          </span>
          {mode === "dark" ? "라이트 모드" : "다크 모드"}
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-64 min-h-screen">
          <div className="mx-auto max-w-7xl px-8 py-10 animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/interfaces" element={<InterfaceList />} />
              <Route path="/interfaces/new" element={<InterfaceEditor mode="create" />} />
              <Route path="/interfaces/:id" element={<InterfaceEditor mode="edit" />} />
              <Route path="/logs" element={<LogViewer />} />
              <Route path="/api-tester" element={<ApiTester />} />
              <Route path="/code-maps" element={<CodeMapList />} />
              <Route path="/code-maps/:groupId" element={<CodeMapEditor />} />
            </Routes>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
