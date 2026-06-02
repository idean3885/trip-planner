# Research: lint/format/디자인 토큰 가드 인프라 (spec 038)

조사일 2026-06-02. 대상: ESLint 9 flat config / Next.js 16 / React 19 / Tailwind v4 환경에서의 lint·format·색상 가드 도구 선정. 모든 채택안은 라이선스(MIT 계열)·현행 호환성을 웹서치로 사전 확인했다.

## 현황 (조사로 확정)

- ESLint 9.39 flat config 이미 사용 (`eslint.config.mjs`), `lint: eslint` 스크립트 — Next.js 16에서 `next lint`가 제거되어 ESLint를 직접 호출하는 형태로 이미 전환돼 있음.
- 확장은 `eslint-config-next`(core-web-vitals + typescript)뿐. Prettier 없음. 색상 가드 없음.

## Decision 1 — TypeScript 일관성 룰 강화

- **Decision**: `typescript-eslint`의 type-checked 룰을 점진 도입하되 기본은 `recommended` 수준, 위험·소음 큰 type-checked 룰은 warn으로 시작. `eslint-plugin-react-hooks`·`eslint-plugin-jsx-a11y`는 eslint-config-next에 일부 포함 — 명시적으로 강화.
- **Rationale**: ESLint 9 flat config 기본. `eslint-config-next`와 공존 가능. type-checked는 강력하지만 전체 강제 시 기존 코드 대량 위반·CI 속도 부담 → warn 강등으로 완충(spec Clarification 1).
- **Alternatives**: `strict-type-checked` 전면 적용 → 위반 폭증으로 작업 비대화, 기각.

## Decision 2 — Prettier 포맷 규약

- **Decision**: Prettier 도입 + `eslint-config-prettier`(포맷 룰 충돌 제거) + `prettier-plugin-tailwindcss`(클래스 정렬, Tailwind v4 공식 지원).
- **Rationale**: 포맷은 ESLint stylistic 룰보다 Prettier가 표준·단순. Tailwind 클래스 정렬은 공식 Prettier 플러그인이 v4를 지원해 가장 안정적. `eslint-config-prettier`로 ESLint와의 포맷 충돌을 제거.
- **Alternatives**: ESLint stylistic 룰로 포맷 — Prettier 대비 관리 부담↑, 기각. Biome — 별도 생태계 전환 비용, 현 ESLint 자산 유지가 나음, 기각.

## Decision 3 — Tailwind 클래스 린팅

- **Decision**: 클래스 **정렬**은 `prettier-plugin-tailwindcss`로 충당. ESLint용 Tailwind 린팅 플러그인은 이번엔 도입 보류.
- **Rationale**: `eslint-plugin-tailwindcss`(francoismassart)는 Tailwind **v4 지원이 부분적**(beta 채널, `no-contradicting-classname` 등 false positive 위험, 전체 재작성 예정). 대안 `eslint-plugin-better-tailwindcss`는 v4를 다루지만 "native v4"는 아님. 정렬 목적이면 공식 Prettier 플러그인으로 충분 → 불안정한 ESLint 플러그인 도입을 피한다.
- **Alternatives**: `eslint-plugin-better-tailwindcss` 채택 — 추가 린팅(중복 클래스 등) 이점 있으나 v4 성숙도·소음 리스크로 후속 과제로 미룸.

## Decision 4 — 디자인 토큰 색상 가드

- **Decision**: 전용 플러그인 대신 ESLint 내장 `no-restricted-syntax`(+ Tailwind 임의값 정규식)로 hex/rgb/hsl 리터럴과 `-[#...]` 임의값을 차단. 토큰 정의처(`globals.css`의 `@theme`, `design/tokens.json`)와 외부 자산은 예외(파일 단위 ignore).
- **Rationale**: 색상 차단 전용 플러그인(MetaMask `color-no-hex`, Atlassian, Panda `no-hardcoded-color`)은 각자의 디자인 시스템·토큰 포맷에 결합 — 우리의 커스텀 토큰(`design/tokens.json` → `@theme`)과 맞지 않음. 정규식 룰은 의존성 0이고 우리 토큰 규칙에 정확히 맞춤 가능.
- **Alternatives**: 전용 플러그인 — 토큰 포맷 불일치로 오탐/누락, 기각. Stylelint `color-no-hex` — CSS 파일 전용이라 JSX/TS 인라인·임의값을 못 잡음, 부분 보완용으로만 고려.

## Decision 5 — import 정렬

- **Decision**: `eslint-plugin-simple-import-sort` 채택(`--fix` 자동 정렬).
- **Rationale**: flat config 친화, 설정 단순, 자동 수정 가능. `eslint-plugin-import`는 TS resolver 설정·성능 부담이 큼.
- **Alternatives**: `eslint-plugin-perfectionist`(광범위 정렬) — 범위 과다, import만 필요하므로 기각. `eslint-plugin-import` — 무겁다, 기각.

## Decision 6 — 기존 코드 정비 전략

- **Decision**: `eslint --fix` + `prettier --write` 일괄 자동정비를 1순위. 자동 해소 불가 잔여(주로 type-checked·a11y)는 해당 룰을 warn으로 강등하거나 파일 단위 `eslint-disable`로 보류하고 잔여 목록을 기록. 정비 후 `vitest run`(57 테스트) 전부 통과로 동작 동등성 확인.
- **Rationale**: spec Clarification 1·US3 — 인프라는 빠르게 깔고 화면 작업으로 넘어가야 하므로 정비 비대화를 막는다.

## 라이선스·호환성 확인 결과

- typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, eslint-plugin-simple-import-sort, prettier, eslint-config-prettier, prettier-plugin-tailwindcss — 모두 MIT, ESLint 9 flat config / React 19 / Tailwind v4 호환 확인.
- `next lint` 제거(Next 16)는 이미 대응됨 — 추가 조치 불필요.

## Sources

- [Configuration: ESLint | Next.js](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Next.js 16 Linting setup using ESLint 9 flat config | chris.lu](https://chris.lu/web_development/tutorials/next-js-16-linting-setup-eslint-9-flat-config)
- [eslint-plugin-tailwindcss — Support Tailwind 4 (Issue #325)](https://github.com/francoismassart/eslint-plugin-tailwindcss/issues/325)
- [eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss)
- [MetaMask eslint-plugin-design-tokens — color-no-hex](https://github.com/MetaMask/eslint-plugin-design-tokens/blob/main/docs/rules/color-no-hex.md)
- [Atlassian — ensure design token usage](https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage/)
