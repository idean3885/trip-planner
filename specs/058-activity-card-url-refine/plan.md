# Implementation Plan: 여행 상세 활동 카드·URL 필드·폼 반응형·가져오기 정보구조 정비

**Branch**: `058-activity-card-url-refine` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/058-activity-card-url-refine/spec.md`

## Summary

여행 상세 일정 화면의 정돈도와 활동 데이터 표현을 다듬는 묶음 피처다. (1) 하단 일정 패널의 컨테이너 보더를 없애 활동 카드만 남기고, (2) 활동 0건일 때 빈 상태 안내를 카드로 보이며, (3) 직전 버전(v3.17.1)의 100svh 하단 여백을 줄이되 모바일 캘린더 접힘이 동작할 스크롤 여지를 유지하고, (4) 활동 카드 메모를 3줄로 줄여 보이며, (5) 활동에 메모와 분리된 `url` 속성을 추가(schema-only 마이그레이션)해 폼·카드·상세·API·MCP에 일관 노출하고, (6) 320px 폭에서 활동 폼 시작·종료 입력 겹침을 푸는 반응형 보정, (7) 가져오기 화면을 애플·구글 제목 섹션으로 분리한다.

기술 접근: 신규 의존성 없음. UI는 기존 Tailwind v4 + shadcn/ui(Card)와 `line-clamp` 유틸로 처리. 여백·접힘 문제는 높이 축소 + 스크롤 가드(문서가 뷰포트보다 짧아 클램프된 `scrollY=0`을 사용자 의도와 구분)로 근본 해결. URL은 Prisma `Activity.url String?` 추가 + Zod 스키마 + MCP planner + OpenAPI 동시 반영.

## Coverage Targets

- 하단 일정 패널 컨테이너 보더·배경 제거(활동 카드만) [why: panel-borderless]
- 활동 0건 빈 상태 안내 카드(로딩 스켈레톤과 구분) [why: empty-state-card]
- 하단 여백 축소 + 모바일 접힘용 스크롤 여지 유지(클램프 가드) [why: bottom-spacing] [multi-step: 2]
- 활동 카드 메모 3줄 클램프(상세는 전문) [why: memo-clamp]
- Activity URL 항목 도입 + 마이그레이션 산출(additive expand, 기존 행 NULL 유지, backfill 불필요) [why: activity-url-schema] [multi-step: 2]
- URL 폼 입력 + 활동 카드·상세 링크 표시 [why: activity-url-ui] [multi-step: 2]
- URL API(Zod 입출력) + MCP·OpenAPI 표현 [why: activity-url-contract] [multi-step: 2]
- 활동 폼 시작·종료 320px 반응형(겹침 해소) [why: form-responsive]
- 가져오기 화면 애플·구글 섹션 분리 [why: import-provider-sections]

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16 App Router, React 19), Python 3.10+ (MCP 서버)  
**Primary Dependencies**: Next.js 16, React 19, Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored Card 등), Prisma 7(@prisma/adapter-pg, Neon), Zod, FastMCP/httpx. **본 피처 신규 의존성 도입 없음.**  
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`, #318). Prisma 마이그레이션 1건 — `activities.url` 컬럼 추가(nullable).  
**Testing**: vitest + @testing-library (웹), 기존 컴포넌트·route 테스트 패턴. MCP는 기존 pytest 패턴(해당 시).  
**Target Platform**: 웹(모바일 ~320px / 데스크탑 반응형) + MCP 도구.  
**Project Type**: 웹 앱(`src/`) + MCP 서버(`mcp/`).  
**Performance Goals**: UI 상호작용 즉시성(추가 네트워크 없음). 마이그레이션은 expand(무중단).  
**Constraints**: 부동 시간 관행(#232) 유지 — 시간 표시 로직 불변, 레이아웃만 변경. 색·radius는 디자인 토큰(`globals.css :root`) 준수. URL 표시는 안전 처리(임의 스크립트 실행 금지, 기존 `Linkify` 안전 패턴 재사용).  
**Scale/Scope**: UI 5건 + 스키마 1건 + 가져오기 IA 1건. 단일 마일스톤 v3.18.0.

## Constitution Check

*GATE: Phase 0 전 통과, Phase 1 후 재확인.*

- **I. AX-First**: URL을 메모와 분리해 AI/연동이 링크를 구조적으로 다룰 수 있게 함 → 부합.
- **II. Minimum Cost**: 신규 라이브러리 0. Tailwind `line-clamp`·기존 Card·Zod 재사용 → 부합.
- **III. Mobile-First**: 본 피처 핵심이 모바일 정돈(여백·빈상태·320px 폼·가져오기 IA) → 부합·강화.
- **IV. Incremental Release**: schema-only expand 마이그레이션, 기존 데이터 무영향, 단일 마일스톤 → 부합.
- **V. Cross-Domain Integrity**: `Activity`는 trip-planner DB 도메인. `url` 추가는 도메인 내부. 애플 캘린더는 독립 정본이며 본 피처는 가져오기 표시 IA만 손댄다(쓰기 없음) → 부합.
- **VI. RBAC**: URL 입력은 기존 `canEdit`(편집 권한) 게이트 안에서만. 조회는 기존 권한 그대로 → 부합.
- **VII. Calendar Time Model(부동 시간)**: 시작·종료 표시·저장 로직 변경 없음. 폼 레이아웃(반응형)만 조정 → 부합.

**위반 없음.** Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/058-activity-card-url-refine/
├── plan.md              # 본 파일
├── research.md          # Phase 0 — 여백/접힘 가드·line-clamp·url 표현 결정
├── data-model.md        # Phase 1 — Activity.url
├── quickstart.md        # Phase 1 — 검증(Evidence) 규약
├── contracts/           # Phase 1 — activity url 입출력 계약(API/MCP)
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks 산출(별도)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # Activity.url 추가
└── migrations/<ts>_add_activity_url/      # schema-only

src/
├── components/
│   ├── ActivityCard.tsx                   # url 링크 표시 + memo line-clamp(목록)
│   ├── ActivityForm.tsx                   # url 입력 칸 + 시작/종료 반응형(grid-cols-2 → 좁은폭 스택)
│   ├── ActivityList.tsx                   # 활동 0건 빈 상태 카드
│   ├── trip/
│   │   ├── DayActivitiesPane.tsx          # 컨테이너 Card 보더 제거(활동 카드만), 빈상태/로딩 분기
│   │   └── TripDetailLayout.tsx           # 하단 여백 축소(min-h 조정)
│   └── calendar-sync/sections/ImportSection.tsx  # 애플·구글 섹션 분리
├── components/trip/TripDetailLayout.tsx   # 스크롤 클램프 가드(접힘 플립 방지)
├── app/api/trips/[id]/days/[dayId]/activities/route.ts           # url Zod 입출력
├── app/api/trips/[id]/days/[dayId]/activities/[activityId]/route.ts # url Zod 입출력
└── lib/openapi.ts                         # activity 스키마에 url

mcp/
└── trip_mcp/planner.py                    # 활동 생성/수정/표현에 url

tests/
└── components·api 회귀·신규 단언(메모 클램프·빈상태·url·폼 반응형 등)
```

**Structure Decision**: 기존 단일 레포 구조(웹 `src/` + MCP `mcp/`) 유지. 새 디렉토리 없음. 변경은 위 파일에 국한.

## Complexity Tracking

> 헌법 위반 없음 — 작성 불필요.
