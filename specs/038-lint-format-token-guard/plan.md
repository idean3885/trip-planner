# Implementation Plan: lint/format/디자인 토큰 가드 인프라 선행

**Branch**: `038-lint-format-token-guard` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-lint-format-token-guard/spec.md`

## Summary

화면 작업(spec 039~042) 전에 코드 일관성 인프라를 선행한다. ESLint 9 flat config(이미 사용 중)에 타입체크·훅·접근성·import 정렬 룰을 강화하고, Prettier를 도입해 포맷 규약을 고정하며, 디자인 토큰 외 색상 리터럴을 `no-restricted-syntax`로 차단한다. 신규 규칙으로 드러나는 기존 위반은 `eslint --fix`·`prettier --write` 자동정비를 1순위로, 잔여는 warn 강등/파일 예외로 보류한다. 런타임 동작은 불변(기존 vitest 57 테스트 통과로 확인).

## Coverage Targets

- ESLint 일관성 룰 강화 (typescript-eslint recommended + 선택 type-checked warn, react-hooks, jsx-a11y) [why: lint-rules] [multi-step: 2]
- import 정렬 룰 도입 (simple-import-sort) [why: import-sort]
- Prettier 포맷 규약 도입 (prettier + eslint-config-prettier + prettier-plugin-tailwindcss + format 스크립트) [why: format] [multi-step: 2]
- 디자인 토큰 색상 가드 (no-restricted-syntax: hex/rgb/hsl + Tailwind `-[#...]` 임의값 차단, **신규 error 강도**, 기존 위반 파일은 예외로 보류 후 점진 정리, 토큰 정의처·외부 자산 예외) [why: color-guard] [multi-step: 2]
- 기존 코드 자동정비 + 잔여 분류 기록 (eslint --fix·prettier --write, 잔여 warn/예외, vitest 동등성 확인) [why: cleanup] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16, React 19)  
**Primary Dependencies**: ESLint 9.39 (flat config), eslint-config-next 16.2, + 신규 devDeps: typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, eslint-plugin-simple-import-sort, prettier, eslint-config-prettier, prettier-plugin-tailwindcss  
**Storage**: N/A (설정·도구 변경, 데이터 스키마 변경 없음)  
**Testing**: Vitest 4 (기존 57 테스트로 동작 동등성 확인). lint/format은 명령 실행 증거로 검증  
**Target Platform**: 개발 환경(로컬·CI) — 런타임 산출물 불변  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: lint 실행이 개발 흐름을 막지 않을 것 (type-checked 룰은 적정 수준으로 제한)  
**Constraints**: 런타임 동작·화면 결과 불변. 정비 작업 비대화 금지(자동정비 우선)  
**Scale/Scope**: src/ 전체 + tests/ — 설정 파일 + 일괄 자동정비. 신규 화면 코드 없음

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. AX-First**: 해당 없음 (개발 인프라). 위반 없음.
- **II. Minimum Cost**: 신규 도구는 전부 무료(MIT) devDependencies. 추가 과금 없음. ✅
- **III. Mobile-First**: 런타임 산출물 불변 — 영향 없음. ✅
- **IV. Incremental Release**: 기존 기능 불변(동작 동등성 테스트로 보증). ✅
- **V. Cross-Domain Integrity**: 도메인 데이터 미접촉. ✅
- **VI. Role-Based Access**: 권한 행위 변경 없음. ✅
- **VII. Calendar Time Model**: 시간 로직 미접촉. ✅

→ 위반 없음. Phase 0 진행 가능. (Phase 1 후 재검토: 설계가 설정 파일·정비에 한정되어 헌법 영향 없음 — 통과)

## Project Structure

### Documentation (this feature)

```text
specs/038-lint-format-token-guard/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 도구 선정 근거
├── quickstart.md        # Phase 1 — 검증 Evidence 규약
├── checklists/
│   └── requirements.md  # spec 품질 체크리스트
└── tasks.md             # /speckit.tasks 산출 (이 단계에서 미생성)
```

### Source Code (repository root)

```text
eslint.config.mjs          # 룰 강화 (typescript-eslint, react-hooks, jsx-a11y, simple-import-sort, no-restricted-syntax 색상 가드, eslint-config-prettier)
.prettierrc(.json/.mjs)    # 신규 — Prettier 규약 + prettier-plugin-tailwindcss
.prettierignore            # 신규 — 빌드 산출물·생성물 제외
package.json               # devDeps 추가 + scripts (lint:fix, format, format:check)
src/**                     # 자동정비 대상 (eslint --fix·prettier --write 일괄)
tests/**                   # 자동정비 대상 (동작 동등성은 vitest로 확인)
docs/ 또는 specs/038-.../  # 잔여 위반·예외 목록 기록
```

**Structure Decision**: 신규 디렉토리 없음. 루트 설정 파일(eslint.config.mjs, .prettierrc, package.json) 변경 + src/·tests/ 일괄 포맷. 색상 가드 예외는 globals.css의 `@theme` 정의처와 외부 자산에 한정.

## Complexity Tracking

> Constitution Check 위반 없음 — 작성 불필요.
