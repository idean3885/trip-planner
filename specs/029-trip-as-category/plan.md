# Implementation Plan: 여행을 일정 카테고리로 재정의 + 캘린더 형태 뷰 도입

**Branch**: `029-trip-as-category` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-trip-as-category/spec.md`

## Summary

여행(Trip)의 시작·종료 날짜를 명목 입력 컬럼에서 등록된 일정(Day)에서 자동 계산되는 derived 값으로 전환하고, 여행 상세 화면을 캘린더 영역(항상 노출) + 일정 리스트 영역(desktop=사이드 split / mobile=하단 stacked + in-place swap) 두 영역으로 재설계합니다. 사용자가 사이드 체크박스로 다른 여행을 켜면 같은 캘린더에서 통합 뷰로 확장됩니다. expand-and-contract 패턴으로 Prisma 컬럼을 전환하고, MCP `create_trip`/`update_trip` 시그니처는 v3.0.0 MAJOR breaking으로 `startDate`/`endDate` 파라미터를 제거합니다. spec 030(MCP 자동 부트스트랩)과 v3.0.0 마일스톤 묶음으로 동시 출시합니다.

## Coverage Targets

- 데이터 모델 expand — `Trip` 모델에 derived 계산 헬퍼 노출 + 명목 컬럼은 첫 일정 추가 전까지 fallback으로만 사용 [why: trip-derived-expand] [multi-step: 2] [migration-type: schema-only]
- 데이터 모델 migrate — 코드 전체(`computeDayNumber`, 외부 캘린더 import·push 기간, OpenAPI 응답)를 derived 사용으로 전환 [why: trip-derived-migrate] [multi-step: 3]
- 데이터 모델 contract — 명목 컬럼(`Trip.startDate`/`endDate`) 제거 + 마이그레이션 [why: trip-derived-contract] [migration-type: schema-only]
- 월별 미니 캘린더 (트립 기간 강조 + 오늘 강조 + 월 이동) [why: calendar-view-month] [multi-step: 2]
- desktop split 레이아웃 (캘린더 + 사이드 일정 리스트 동시 노출) [why: calendar-desktop-split]
- mobile stacked + in-place swap (캘린더 상단 + 하단 리스트, 좌 스와이프 뒤로) [why: calendar-mobile-stacked] [multi-step: 2]
- 통합 캘린더 + 체크박스 토글 (여러 여행 동시 노출, 라벨 색 자동 부여) [why: calendar-multi-trip] [multi-step: 2]
- MCP 시그니처 breaking (create_trip/update_trip의 startDate/endDate 제거) [why: mcp-trip-signature-breaking]
- 외부 캘린더 import·공유 캘린더 push 기간을 derived로 전환 [why: external-cal-derived]
- 일정 0건 여행 UX (트립 목록 "일정 미정" 카드 + 캘린더 그리드 미노출) [why: empty-trip-ux]

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16 App Router) + Python 3.10+ (MCP 서버, 본 피처는 시그니처 변경만)
**Primary Dependencies**: Next.js 16, React 19, Prisma 7 (Neon Postgres adapter), Auth.js v5, shadcn/ui (vendored), Radix UI primitives, Tailwind CSS v4 (`@theme` CSS-first), `class-variance-authority`, `tailwind-merge`, `lucide-react`. 캘린더 라이브러리는 Phase 0 research에서 결정 (후보: react-day-picker, shadcn/ui Calendar, 자체 구현).
**Storage**: Neon Postgres. Production `neondb` / Preview·Dev `neondb_dev` (#318)
**Testing**: Vitest (단위), Playwright (선택적 E2E — desktop split + mobile swipe), pytest (MCP)
**Target Platform**: 웹 브라우저 (Vercel — `trip.idean.me` prod, `dev.trip.idean.me`). viewport mobile <1024px / desktop ≥1024px ([`docs/glossary.md`](../../docs/glossary.md) 정본)
**Project Type**: web (Next.js app + MCP 서버 묶음 monorepo)
**Performance Goals**: SC-001 일정 추가 후 화면 즉시 갱신 (no full refresh, optimistic update + revalidate). SC-005 mobile 캘린더 ↔ 일정 swap 1초 이내. derived 기간 계산은 DB 쿼리 1회(`min/max(Day.date)`)
**Constraints**: viewport ≥1024px split, <1024px stacked. 라우팅 변경 없이 mobile 일정 swap(in-place). 좌 스와이프 = 뒤로(브라우저 history 미변경). 캘린더는 항상 노출(닫기 버튼 없음). 캘린더 ↔ 목록 토글 없음
**Scale/Scope**: 1인 + 동행자 2~5명 / 사용자. 여행 ≤ 수십 건. 일정 ≤ 수백 건 / 여행. 통합 캘린더에 동시 표시 여행 ≤ 10건

## Constitution Check

*GATE: Phase 0 research 진입 전 통과 필수. Phase 1 design 후 재검증.*

| 원칙 | 평가 | 비고 |
|------|------|------|
| I. AX-First | ✅ 통과 | 캘린더 뷰는 사람이 직접 사용. AI 자동화는 spec 030이 담당. 본 spec은 mental model에 맞춘 UX 보강이라 AX 우선과 모순 없음 |
| II. Minimum Cost | ✅ 통과 | 신규 유료 의존성 0. 캘린더 라이브러리는 무료(react-day-picker MIT 또는 shadcn vendored) |
| III. Mobile-First Delivery | ✅ 통과 | viewport <1024px stacked + swipe in-place + 캘린더 우선 노출. 비개발자 동행자 mobile 사용 시나리오 정합 |
| IV. Incremental Release | ⚠️ 주의 | v3.0.0 MAJOR. expand-and-contract 패턴으로 expand(v2.17.x) → migrate(v2.18.x or v3.0.0-rc) → contract(v3.0.0)로 분해해 무중단 정책 유지. spec 030과 동시 출시는 마일스톤 묶음이라 정합 |
| V. Cross-Domain Integrity | ✅ 통과 | Trip·Day·Activity는 일정 편성 도메인. 외부 캘린더(여행 활용)는 derived 기간만 조회. 권한 검증 변경 없음 |
| VI. Role-Based Access Control | ✅ 통과 | 캘린더 뷰 자체는 여행 조회 권한(GUEST 가능). 일정 편집은 기존 OWNER/HOST 매트릭스 그대로 |

**Gate 결과**: 통과. Phase 0 research 진입.

## Project Structure

### Documentation (this feature)

```text
specs/029-trip-as-category/
├── plan.md                       # This file
├── research.md                   # Phase 0 output
├── data-model.md                 # Phase 1 output
├── quickstart.md                 # Phase 1 output
├── contracts/                    # Phase 1 output
│   ├── api-trip-response.md      # Trip 응답 스키마 (derived 노출)
│   ├── api-trip-list-query.md    # GET /api/v2/trips query (체크박스 prefs)
│   └── mcp-trip-tools.md         # create_trip/update_trip 시그니처 (v3.0.0 breaking)
├── checklists/
│   └── requirements.md           # specify 단계 산출
└── tasks.md                      # Phase 2 (별도 /speckit.tasks)
```

### Source Code (web app + MCP 묶음 monorepo)

```text
src/                              # Next.js 16 web app
├── app/
│   ├── trips/
│   │   ├── page.tsx              # 여행 목록 — 일정 미정 카드·체크박스 prefs 적용
│   │   └── [id]/
│   │       ├── page.tsx          # 여행 상세 — split/stacked 진입점
│   │       └── day/[dayId]/page.tsx  # 일자 상세 (현행 유지)
│   └── api/v2/
│       └── trips/
│           ├── route.ts          # 목록 — derived 기간 응답
│           └── [id]/route.ts     # 단건 — derived 기간 응답
├── components/
│   └── trip/
│       ├── TripDetailLayout.tsx  # split(desktop)·stacked(mobile) 분기
│       ├── CalendarView.tsx      # 월별 미니 캘린더 (react-day-picker 또는 shadcn Calendar)
│       ├── DayActivitiesPane.tsx # 사이드/하단 일정 리스트
│       ├── TripCheckboxes.tsx    # 사이드 여행 체크박스 (통합 뷰 토글)
│       └── MobileSwipeShell.tsx  # mobile in-place swap + 좌 스와이프 hooks
└── lib/
    ├── trip-period.ts            # derived 계산 헬퍼 (min/max Day.date)
    └── trip-palette.ts           # 통합 뷰 여행 라벨 색 자동 부여

prisma/
└── migrations/
    ├── <ts>-trip-period-expand/migration.sql      # schema-only
    └── <ts>-trip-period-contract/migration.sql    # schema-only

mcp/trip_mcp/
└── tools/
    ├── create_trip.py            # startDate/endDate 파라미터 제거 (v3.0.0 breaking)
    └── update_trip.py            # 동일

tests/
├── lib/trip-period.test.ts
├── components/trip/CalendarView.test.tsx
├── components/trip/TripDetailLayout.test.tsx
├── unit/trip-palette.test.ts
└── integration/trip-derived-period.test.ts
```

**Structure Decision**: 기존 monorepo(`src/` Next.js + `mcp/trip_mcp/` Python) 구조 유지. 신규 컴포넌트는 `src/components/trip/` 네임스페이스로 묶고, derived 계산은 `src/lib/trip-period.ts` 단일 진입점에서 정의해 클라이언트(`prisma.day.aggregate`)에서 호출.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 캘린더 라이브러리 신규 의존성(후보) | 월별 미니 캘린더 + 트립 기간 강조 + 키보드 접근성. 자체 구현 시 a11y·로케일 처리 비용 큼 | 자체 구현은 react-day-picker·shadcn Calendar의 i18n·a11y 기능을 새로 만들어야 함. react-day-picker 또는 shadcn 둘 다 무료 MIT, Phase 0 research에서 선택 |
| desktop/mobile 레이아웃 분기 | 두 형태 인터랙션 자체가 다름(split persistent vs swipe in-place) | 단일 레이아웃은 사용자 mental model("오늘 며칠?" 즉시 노출)과 mobile swipe 인터랙션을 동시 달성 못 함 |

## Phase 0 — Research

`research.md`로 합쳐 작성합니다.

### Topic 1: 캘린더 라이브러리 선택

**Unknowns**: 월별 미니 캘린더 + 트립 기간 강조 + 오늘 강조 + 다중 트립 일정 dot 표시 + a11y + ko-KR 로케일을 충족하는 라이브러리.

**Tasks**:
- shadcn/ui Calendar(현행 디자인 시스템 정합) vs react-day-picker(shadcn Calendar의 underlying lib) vs 자체 구현 비교
- 다중 트립 색 dot 표시 슬롯 지원 여부
- ko-KR 주 시작·휴일 색 처리
- 모바일 터치 스와이프와 충돌 안 하는지

### Topic 2: derived 기간 계산 시점·캐싱

**Unknowns**: `Trip.startDate`/`endDate`를 매 응답 시 `min/max(Day.date)` 쿼리로 계산할지, Prisma `@@derivedField` 같은 캐시를 둘지, 또는 Day 변경 시 Trip 컬럼을 webhook으로 갱신할지.

**Tasks**:
- Prisma 7의 derived/computed field 지원 여부 확인
- 일정 ≤ 수백 건 / 여행 규모에서 매 응답 aggregate 쿼리의 latency 측정 (DB 인덱스 `(tripId, date)` 존재 여부)
- expand 단계에서 명목 컬럼 + derived 동시 노출 → migrate에서 derived 전환 → contract에서 명목 제거 순서 명확화

### Topic 3: mobile in-place swap + 좌 스와이프 뒤로

**Unknowns**: 라우팅 변경 없이 한 화면에서 콘텐츠 swap + 좌 스와이프 = 뒤로 인터랙션을 React/Next.js 16에서 어떻게 구현할지. 브라우저 history는 미변경.

**Tasks**:
- `react-swipeable` 같은 swipe hook lib 후보 검토
- 또는 native Pointer Events + CSS transform으로 swap 처리
- 접근성(키보드 사용자) 대안 — 좌 스와이프 외 ESC 또는 "뒤로" 버튼 동시 제공

### Topic 4: 사용자 prefs 저장 위치

**Unknowns**: 사이드 체크박스 상태(어느 여행 켜졌는지)·기타 뷰 prefs를 localStorage(client-only) vs DB(사용자 동기화) 어디에 둘지.

**Tasks**:
- 1인 + 동행자 소수 환경에서 device 동기화 필요성 분석
- DB 저장 시 schema 비용(`UserPref` 모델 신설) vs localStorage 단순성
- 기존 `User` 모델에 JSON 컬럼 추가 가능성

### Topic 5: 트립 라벨 색 자동 부여

**Unknowns**: 다중 트립 통합 뷰에서 각 여행의 색을 어떻게 자동 부여할지. 사용자가 색을 선택 못 하면 자동 hash 기반? Palette pool 순환?

**Tasks**:
- Google Calendar의 색 부여 정책 참조
- Palette pool(예: shadcn token에서 6~8색) 순환 hash 방식 vs 트립 생성 순서 기반
- 색 대비(WCAG AA) 검증 필요성

### Topic 6: expand-and-contract 마이그레이션 분해

**Unknowns**: 어느 release에서 expand → migrate → contract를 나눌지. v2.17.x · v2.18.x · v3.0.0 묶음 결정.

**Tasks**:
- v2.17.0 (MINOR): expand — `Trip.startDate`/`endDate`는 유지 + 코드에 derived 헬퍼 도입(둘 다 노출)
- v2.18.0 (MINOR): migrate — 모든 호출처를 derived 사용으로 전환, 명목 컬럼은 첫 일정 전 fallback에만 사용
- v3.0.0 (MAJOR): contract — 명목 컬럼 제거 + MCP 시그니처 breaking + spec 030(자동 부트스트랩) 동시 출시

**Output**: `specs/029-trip-as-category/research.md`

## Phase 1 — Design & Contracts

### data-model.md

추출 대상:

| 엔티티 | 변경 |
|--------|------|
| `Trip` | (expand) 명목 컬럼 유지 + derived 계산 헬퍼 도입. (contract) `startDate`/`endDate` 컬럼 제거 |
| `Day` | 변경 없음 (derived 계산의 단위로 사용) |
| `Activity` | 변경 없음 |
| `UserPref` | (신설 또는 `User` JSON 컬럼) — 사용자 마지막 사이드 체크박스 상태 |

상태 전이: Trip은 "일정 0건" → "일정 ≥1건" 전이 시 derived 기간이 null → 첫 일정 날짜로 변경. 명목 기간은 fallback에서만 사용 후 무의미.

### contracts/

* `contracts/api-trip-response.md` — `GET /api/v2/trips`, `GET /api/v2/trips/[id]` 응답에 derived `startDate`/`endDate` 노출. 일정 0건이면 null. 응답 필드명·위치는 호환(값 출처만 변경).
* `contracts/api-trip-list-query.md` — `GET /api/v2/trips` query parameter — 캘린더 사이드 체크박스 prefs용 `?include_tripIds=...` (선택). default는 사용자 본인이 속한 모든 여행 메타.
* `contracts/mcp-trip-tools.md` — `create_trip` / `update_trip` 시그니처. v3.0.0 기준 `startDate`/`endDate` 파라미터 **제거**(breaking). 호출 시 첫 `create_day` / `create_activity`로 derived 기간 부여.

### quickstart.md

`### Evidence` 섹션에 자동 검증(Vitest 단위 + 통합 테스트 명령) + 수동 검증(브라우저에서 desktop split 노출 확인·mobile swipe 1초 응답) 명시.

### Agent context update

`.specify/scripts/bash/update-agent-context.sh claude` 실행 (Phase 1 산출 직후).

## Phase 2 — Tasks (out of scope)

`/speckit.tasks`가 plan + design 산출물에서 메타태그 4종 부착된 tasks.md를 생성합니다. 본 plan은 Coverage Targets bullet 별 [why] 태그와 [multi-step] 수치를 명시해 tasks 자동 매핑 기반을 마련합니다.

## Dependencies & Risks

* **spec 030 (MCP 자동 부트스트랩)**과 v3.0.0 마일스톤 묶음. spec 029의 MCP breaking이 spec 030의 자동 업데이트 흐름과 정합돼야 사용자가 업데이트 안내를 받을 수 있음.
* `Trip.startDate`/`endDate` 컬럼 제거 시점에 외부 캘린더 import·공유 캘린더 push 코드가 derived로 완전 전환돼 있어야 함 — migrate 단계의 회귀 risk 가장 큼.
* mobile in-place swap의 brower history 미변경 정책이 사용자가 브라우저 뒤로가기 버튼으로 트립 상세를 벗어나는 흐름과 충돌하지 않아야 함 — Edge case에 이미 명시(브라우저 뒤로 = 이전 페이지로).
* 트립 라벨 색 자동 부여 정책은 색 대비(WCAG AA) 검증을 plan 후 design 단계에서 수행. Palette 결정은 Phase 0 Topic 5 산출.

## Notes

* spec 026의 4단 breakpoint 토큰은 디자인 토큰 차원에서 유지, 레이아웃 분기점은 본 spec의 1024px 단일을 따름 (`docs/glossary.md` 정본).
* expand-and-contract 패턴은 메모 [project_expand_contract_pattern] 정합 — v2.7.0 적용 흐름 참조.
* 디자이너 핸드오프(Figma 캡처 3종)는 별도 이슈로 등록 예정. 현재 spec·plan에는 텍스트 설명만 포함.
