import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 개발: /api 요청을 백엔드(8080)로 프록시 → CORS 불필요
// 배포: build 산출물을 Spring Boot 정적 리소스 경로로 출력 → jar 하나로 패키징
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
      "/h2-console": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  build: {
    // SPA가 메인 앱. 산출물은 static 루트로 나가 jar에 포함된다.
    // 구 대시보드는 static/dashboard-legacy.html 로 보존(참조용). SPA 대시보드가 이관 완료되면 삭제.
    // 주의: 이 빌드는 static/index.html 을 SPA로 덮어쓴다(정상).
    outDir: "../src/main/resources/static",
    emptyOutDir: false,
  },
});
