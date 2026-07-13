/**
 * Interface Studio 로고 (SVG 재현).
 * 원본 모티프: 소문자 i + 대문자 S, 파랑→보라 그라데이션,
 * i의 하단과 S의 중단을 잇는 노드-와이어(데이터 연결).
 * 벡터라 어떤 크기에서도 잘리지 않고 선명하다.
 */
export function LogoSymbol({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="isGrad" x1="10" y1="20" x2="90" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2E90FA" />
          <stop offset="55%" stopColor="#4E5FFF" />
          <stop offset="100%" stopColor="#8B3DFF" />
        </linearGradient>
      </defs>

      {/* i 점 */}
      <circle cx="22" cy="22" r="9" fill="#2E90FA" />
      {/* i 기둥 */}
      <rect x="14" y="38" width="16" height="48" rx="8" fill="url(#isGrad)" />

      {/* S: 스트로크 기반, 위가 오른쪽으로 열리고 아래가 왼쪽으로 열리는 형태 */}
      <path
        d="M 84 32
           Q 84 22 74 22
           L 56 22
           Q 42 22 42 36
           Q 42 50 56 50
           L 70 50
           Q 84 50 84 65
           Q 84 80 70 80
           L 48 80"
        stroke="url(#isGrad)"
        strokeWidth="15"
        strokeLinecap="round"
        fill="none"
      />

      {/* 연결 와이어: i 하단 노드 → S 중단 노드 (데이터 흐름 모티프) */}
      <line x1="36" y1="62" x2="62" y2="62" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <circle cx="36" cy="62" r="6" fill="white" />
      <circle cx="62" cy="62" r="6" fill="white" />
      <circle cx="36" cy="62" r="3.2" fill="#4E5FFF" />
      <circle cx="62" cy="62" r="3.2" fill="#7A45FF" />
    </svg>
  );
}
