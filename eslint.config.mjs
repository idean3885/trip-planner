import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

// 디자인 토큰 색상 가드 (spec 038): 토큰 외 색상 리터럴 직접 사용 차단.
// 색은 design/tokens.json → @theme 변수/팔레트 클래스로만 표현한다.
const colorGuardRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "Literal[value=/#(?:[0-9a-fA-F]{3,4}){1,2}\\b/]",
      message:
        "색상 hex 리터럴 직접 사용 금지 — 디자인 토큰(@theme 변수 또는 팔레트 클래스)을 사용하세요. (spec 038 색상 가드)",
    },
    {
      selector: "Literal[value=/\\b(?:rgb|rgba|hsl|hsla)\\(/]",
      message:
        "색상 함수 리터럴(rgb/hsl) 직접 사용 금지 — 디자인 토큰을 사용하세요. (spec 038 색상 가드)",
    },
    {
      selector: "Literal[value=/-\\[#[0-9a-fA-F]/]",
      message:
        "Tailwind 색상 임의값(-[#...]) 금지 — 디자인 토큰 클래스를 사용하세요. (spec 038 색상 가드)",
    },
  ],
};

const eslintConfig = defineConfig([
  // 코드 외 산출물·탐색 잔재·비추적 디렉토리 제외 (web/ 은 옛 탐색 잔재, 비추적)
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "test-results/**",
    "next-env.d.ts",
    "web/**",
    "spike/**",
    ".venv/**",
    ".vercel/**",
    "mcp/**",
    "mcp-servers/**",
    "public/**",
  ]),

  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.recommended,

  // import/export 정렬 + 색상 가드 (소스 대상)
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      // `_` 접두 변수/인자는 의도적 미사용 표시로 허용 (typescript-eslint 표준 컨벤션)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // effect 내 동기 setState: 동작 변경 위험으로 자동수정 불가 → warn 강등 후 점진 검토 (spec 038 잔여 분류)
      "react-hooks/set-state-in-effect": "warn",
      ...colorGuardRules,
    },
  },

  // 색상 가드 예외: 테스트·E2E·스크립트는 리터럴 색 사용 허용
  {
    files: ["**/*.test.*", "**/*.spec.*", "tests/**", "e2e/**", "scripts/**"],
    rules: { "no-restricted-syntax": "off" },
  },

  // 색상 가드 예외: next/og ImageResponse 라우트(파일 컨벤션)는 Satori가
  // CSS 변수·토큰을 해석하지 못해 리터럴 색이 불가피. 값은 globals.css :root
  // 팔레트를 그대로 반영하며, 팔레트 변경 시 함께 갱신한다 (#907).
  {
    files: [
      "**/opengraph-image.tsx",
      "**/twitter-image.tsx",
      "**/icon.tsx",
      "**/apple-icon.tsx",
    ],
    rules: { "no-restricted-syntax": "off" },
  },

  // Prettier 와 충돌하는 포맷 룰 비활성화 (반드시 마지막)
  eslintConfigPrettier,
]);

export default eslintConfig;
