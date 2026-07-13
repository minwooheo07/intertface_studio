import { Banner } from "../components/ui/Banner";
export default function LogViewer() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">실행이력</h1>
        <p className="text-sm text-fg-muted mt-0.5">건별 송수신 로그와 재처리</p>
      </header>
      <Banner tone="info" title="이관 예정"
        description="로그 조회·필터·재처리 화면은 다음 단계에서 붙습니다. 현재는 인터페이스 정의 관리가 우선입니다." />
    </div>
  );
}
