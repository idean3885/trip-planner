import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    pool: "vmThreads",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/app/api/trips/*/days/*/activities/**",
        "src/app/api/trips/*/days/*/route.ts",
        "src/components/Activity*.tsx",
      ],
      // ADR 0010 — 커버리지 100% 강박에서 80/75 로 완화. include 범위(활동 핵심
      // 파일)는 유지하되, stopPropagation·방어 분기 같은 사소한 경로를 위한 테스트
      // 작성·`c8 ignore` 주석 공수를 없앤다. 테스트는 TDD 명세로서 가치를 두고,
      // 외부 연동·시각/터치는 리뷰·실기기로 검증한다.
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
