---
description: "Task list for spec 038 — lint/format/디자인 토큰 가드 인프라 선행"
---

# Tasks: lint/format/디자인 토큰 가드 인프라 선행

**Input**: Design documents from `/specs/038-lint-format-token-guard/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: 본 피처는 런타임 동작이 없는 인프라 작업이라 신규 자동 테스트를 추가하지 않는다. 동작 동등성은 기존 vitest 57 테스트 통과로 검증한다(US3).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup — 의존성 도입

- [x] T001 lint/format devDependencies 설치 (typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, eslint-plugin-simple-import-sort, prettier, eslint-config-prettier, prettier-plugin-tailwindcss) [artifact: package.json] [why: lint-rules]
- [x] T002 package.json 스크립트 추가 (lint:fix, format, format:check) [artifact: package.json::scripts] [why: format]

## Phase 2: Foundational — 설정 골격

- [x] T003 eslint.config.mjs에 플러그인 묶음 골격 추가 (typescript-eslint, react-hooks, jsx-a11y, simple-import-sort, eslint-config-prettier를 nextVitals/nextTs 뒤에 배치) [artifact: eslint.config.mjs] [why: lint-rules]

## Phase 3: US1 — 강화된 일관성 규칙·포맷 (Priority: P1)

**Goal**: 신규 코드가 일관성 규칙·포맷을 자동으로 따른다.
**Independent Test**: 위반 샘플에 `npm run lint`가 규칙명과 함께 보고, `npm run format:check`가 미정렬을 잡는다.

- [x] T004 [US1] typescript-eslint recommended 적용 + 소음 큰 type-checked 룰은 warn 강등 설정 [artifact: eslint.config.mjs] [why: lint-rules]
- [x] T005 [US1] react-hooks·jsx-a11y 권장 룰 명시적 강화 [artifact: eslint.config.mjs] [why: lint-rules]
- [x] T006 [US1] simple-import-sort 규칙 활성화 (import/export 정렬, --fix 대상) [artifact: eslint.config.mjs] [why: import-sort]
- [x] T007 [P] [US1] Prettier 규약 파일 작성 (.prettierrc.json + prettier-plugin-tailwindcss 등록) [artifact: .prettierrc.json] [why: format]
- [x] T008 [P] [US1] .prettierignore 작성 (.next, build, 생성물, prisma 마이그레이션 제외) [artifact: .prettierignore] [why: format]

## Phase 4: US2 — 디자인 토큰 색상 가드 (Priority: P1)

**Goal**: 토큰 외 색상 리터럴을 신규 작성 시 차단(error).
**Independent Test**: hex/rgb/`-[#...]` 샘플에 `npm run lint`가 error, 토큰 정의처는 예외 통과.

- [x] T009 [US2] no-restricted-syntax 색상 가드 룰 추가 (hex/rgb/hsl 리터럴 + Tailwind `-[#...]` 임의값, error 강도, 안내 메시지) [artifact: eslint.config.mjs] [why: color-guard]
- [x] T010 [US2] 색상 가드 예외 설정 (globals.css @theme 정의처, design/tokens.json, 외부 자산 ignore + 기존 위반 파일 한시 예외 목록) [artifact: eslint.config.mjs] [why: color-guard]

## Phase 5: US3 — 정비 비대화 방지 + 동작 동등성 (Priority: P2)

**Goal**: 기존 위반을 자동정비 우선 처리, 잔여는 warn/예외, 동작 불변.
**Independent Test**: `eslint --fix`·`prettier --write` 후 위반 급감, `npm run lint` exit 0, `npm run test` 57 통과.

- [x] T011 [US3] eslint --fix + prettier --write 일괄 자동정비 실행 및 결과 커밋 [artifact: src|tests] [why: cleanup]
- [x] T012 [US3] 자동정비 후 잔여 위반 분류 (warn 강등 또는 파일 단위 eslint-disable) + 잔여 목록 기록 [artifact: specs/038-lint-format-token-guard/residual-violations.md] [why: cleanup]

## Phase 6: Polish & 검증

- [x] T013 npm run lint exit 0 + npm run format:check 통과 + npm run test (vitest 57) 전부 통과 확인 [artifact: specs/038-lint-format-token-guard/quickstart.md] [why: cleanup]
- [x] T014 quickstart.md Evidence 수동 체크리스트 체크 + CLI 로그 기록 [artifact: specs/038-lint-format-token-guard/quickstart.md] [why: cleanup]
- [ ] T015 towncrier 단편 작성 (changes/702.chore.md — What/이유, 합쇼체) [artifact: changes/702.chore.md] [why: format]

## Dependencies

- T001 → T002, T003 (의존성 설치 선행)
- T003 → T004~T010 (설정 골격 후 룰 추가)
- US1(T004~T008), US2(T009~T010)는 설정 후 병렬 가능 (같은 eslint.config.mjs 편집은 순차)
- US3(T011~T012)는 US1·US2 룰 확정 후 (룰이 있어야 정비 대상 확정)
- T013~T015는 마지막

## Notes

- T015(towncrier 단편)는 release build가 단편을 소비하므로 `[ ]` 미체크 유지 (drift 부재 fail 방지).
- 색상 가드 강도: 신규 error, 기존 위반 파일은 T010에서 한시 예외 → 후속 feature에서 점진 정리.
