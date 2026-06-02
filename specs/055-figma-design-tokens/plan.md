# Implementation Plan: Figma 디자인 토큰 전면 정합

**Branch**: `055-figma-design-tokens` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/055-figma-design-tokens/spec.md`

## Summary

Figma 디자인(Trip Planner, file key `Q9CK8aGJQu1sSnde8uQ44H`) 전수 파싱으로 추출한 색·타이포·radius·캘린더 셀 상태를 시스템 토큰으로 통일한다. 무채색 shadcn 기본값(oklch grayscale)을 디자인 정확 hex로 교체하고, 캘린더 셀/헤더를 Atoms 8변형 정의대로 신규 시맨틱 토큰으로 재배선한다. 라이트 전용 유지.

접근:
1. `:root`에 디자인 등장 **프리미티브 팔레트**(white·gray-50/100/200/300/600/700/800/900/950·black·blue-500/700·green-50/600/800·pink-400)를 등재하고, shadcn 시맨틱 토큰을 그 팔레트에 매핑(무채색 oklch 제거). `--ring`은 브랜드 블루.
2. 캘린더 **시맨틱 토큰**(`--cal-saturday`·`--cal-sunday`·`--cal-trip-weekend`·`--cal-selected-bg`·`--cal-today-border`·`--cal-inactive*`·`--cal-fill-*` 등)을 Atoms 8변형 추출값으로 신설하고, `CalendarView`의 셀/헤더 분기를 토·일·여행주말·선택·오늘·비활성으로 재배선(현 `bg-primary`/`bg-primary/10` 단순 분기 대체).
3. **Inter** 폰트를 `--font-sans`/`--font-heading` 변수로 연결(`next/font` 변수 노출), `--radius` 8px 기준으로 정렬, 캘린더 셀 4px 명시.
4. **동행 배너** 색을 `#F0FFD7`/`#2F2F2F`로 정합.
5. **하네스 정합**: 색 정본 위치를 `:root`로 명문화하고 `design/tokens.json` `_allowlist` 설명 갱신, `tokens-presence` 테스트에 신규 색 토큰 존재 검사 추가, `audit-tokens`·`build-tokens` 센티넬이 신규 체계와 어긋나지 않게 정합.
6. 회귀·신규 테스트 + 자가 검증 전체 1회.

데이터·API·MCP·카테고리 칩 변경 없음.

## Coverage Targets

- 디자인 등장 색 전수를 프리미티브 팔레트로 등재 + shadcn `:root` 시맨틱 재매핑(무채색 제거) [why: palette-unify] [multi-step: 2]
- 캘린더 시맨틱 토큰 신설 + CalendarView 셀/헤더 상태 재배선(토/일/여행주말/선택/오늘/비활성) [why: calendar-recolor] [multi-step: 2]
- Inter 폰트 변수 연결 + radius 8px 정렬 + 동행 배너 색 정합 [why: typo-radius] [multi-step: 2]
- 토큰 하네스 정합(정본 위치 명문화 + tokens-presence·audit-tokens·build-tokens 센티넬) [why: harness-align] [multi-step: 2]
- 회귀/신규 테스트 + 자가 검증 전체(lint·typecheck·vitest·커버리지) [why: verify]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16, React 19)
**Primary Dependencies**: 신규 의존성 없음 — Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored), `next/font/google`(Inter, 기존 로딩), Style Dictionary 빌드 스크립트(기존)
**Storage**: 변경 없음(UI 토큰 전용). 마이그레이션 없음.
**Testing**: vitest(토큰 존재·캘린더 셀 색 분기·렌더 회귀). 자가 검증 전체 1회 + 커버리지 100%
**Target Platform**: Vercel(웹앱)
**Performance Goals**: 외형 토큰 교체 — 런타임 비용 변화 없음(정적 CSS 변수)
**Constraints**: 라이트 전용(`.dark` 금지). 색은 전부 토큰 경유(하드코딩 hex 금지). 색 정본은 `:root` 시맨틱 변수
**Scale/Scope**: 1인 사용자. globals.css(:root + @theme) + layout(폰트 변수) + CalendarView + 동행 배너 + 토큰 하네스 + 테스트

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **라이트 전용 정책**: `.dark` 블록·다크 토글 도입 안 함 → 준수.
- **라이브러리 우선(ADR-0002)**: 신규 라이브러리 없음(기존 Tailwind/shadcn/Style Dictionary 재사용) → 해당 없음.
- **스펙 우선·기술 중립**: spec은 색·상태 WHAT/WHY만, 구체 hex·변수명은 본 plan에서 → 준수.
- **부동 시간(원칙 VII)**: 시간 표현 로직 불변(외형만) → 영향 없음.
- **무중단 마이그레이션**: 스키마 변경 없음 → 해당 없음.
- 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/055-figma-design-tokens/
├── plan.md
├── spec.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/globals.css         # :root 프리미티브 팔레트 + 시맨틱 재매핑 + 캘린더 토큰 + --radius + 동행 배너 토큰
├── app/layout.tsx          # Inter를 --font-sans/--font-heading 변수로 연결
└── components/trip/CalendarView.tsx   # 셀/헤더 상태 색 재배선(토/일/여행주말/선택/오늘/비활성)

design/
└── tokens.json             # _allowlist 설명 갱신(색 정본 위치 명문화)

scripts/
├── audit-tokens.ts         # 신규 색 토큰 체계와 정합(정본↔산출물 검사)
└── build-tokens.ts         # 센티넬 블록이 신규 체계와 어긋나지 않게 정합

tests/
└── lib/tokens/tokens-presence.test.ts   # 신규 색·캘린더 토큰 존재 검사
└── components/ ...          # 캘린더 셀 색 분기·동행 배너 렌더 테스트
```

**Structure Decision**: UI 토큰 전용 피처. globals.css가 색 정본(:root) — 프리미티브+시맨틱+캘린더 토큰을 한곳에서 관리. layout은 폰트 변수, CalendarView는 셀 색 분기, 하네스는 정본↔산출물 정합. 데이터·API 불변, 라이트 전용.

## Complexity Tracking

> 위반 없음 — 비움.
