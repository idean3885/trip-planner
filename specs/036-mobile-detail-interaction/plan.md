# Implementation Plan: 모바일 트립 상세 인터랙션 개선

**Branch**: `036-mobile-detail-interaction` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-mobile-detail-interaction/spec.md`

## Summary

모바일(<1024px) 트립 상세의 네 가지 인터랙션을 다듬는다. (1) 캘린더 sticky 경계에서 스크롤을 양방향으로 한 번 멈추는 단계화, (2) 미로딩 날짜로도 스와이프가 즉시 넘어가도록 커밋을 데이터 도착에서 분리, (3) 스와이프 시 캘린더 선택 강조를 일정과 같은 타이밍에 갱신, (4) 일정 섹션 상단 날짜 헤더 제거와 '자세히' 버튼 디자인 토큰화. 데이터 스키마·외부 계약 변경은 없고, 변경은 `TripDetailLayout` / `SwipeCarousel` / `DayActivitiesPane`에 국한된다. 시각·터치 거동이 핵심이라 실기기 검증을 1순위 증거로 둔다.

## Coverage Targets

- 캘린더 sticky 경계 스크롤 양방향 1차 정지 [why: scroll-snap-stage] [multi-step: 2]
- 미로딩 날짜 스와이프 즉시 이동(커밋·데이터 분리) [why: swipe-instant] [multi-step: 2]
- 스와이프-캘린더 강조 동시 갱신 [why: swipe-sync-highlight]
- 일정 섹션 상단 날짜/개수 헤더 제거 [why: header-removal]
- '자세히' 버튼 디자인 토큰화 + Ellipsis 제거 [why: detail-button-token]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored), embla-carousel-react, lucide-react. 본 피처에서 신규 의존성 도입 없음.  
**Storage**: N/A (UI 전용, 영속 데이터 스키마 변경 없음)  
**Testing**: Vitest + Testing Library (jsdom). 시각·터치 거동은 실기기 수동 검증 병행.  
**Target Platform**: 모바일 웹 <1024px. 데스크탑(≥1024px) 2분할 레이아웃은 변경하지 않는다.  
**Project Type**: web (Next.js App Router)  
**Performance Goals**: 스와이프·스크롤 60fps, 미로딩 날짜 스와이프 즉시 응답(데이터 도착 대기 0)  
**Constraints**: 모바일 전용 변경, 디자인 토큰 준수, 데스크탑 회귀 0, #649(touch-action으로 세로 스크롤 차단) 회귀 금지  
**Scale/Scope**: 컴포넌트 3종(+테스트) 수준. 신규 화면·엔드포인트 없음.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **III. Mobile-First Delivery**: 직접 부합. 모바일 트립 상세 인터랙션 품질을 끌어올린다.
- **VII. Calendar Time Model(부동 시간)**: 무관. 시간 표시·환산 로직을 건드리지 않는다.
- **V. Cross-Domain Integrity / VI. RBAC**: 무관. 도메인 소유권·권한 경계 변경 없음. 표시·인터랙션만 다룬다.
- **II. Minimum Cost**: 신규 의존성 없음(기존 embla·Tailwind·shadcn 재사용).

→ 위반 없음. Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/036-mobile-detail-interaction/
├── plan.md              # 본 파일
├── spec.md              # 기능 명세
├── research.md          # Phase 0 — 인터랙션 구현 방식 결정
├── quickstart.md        # Phase 1 — Evidence 규약(실기기 + vitest)
├── checklists/
│   └── requirements.md  # 명세 품질 체크리스트
└── tasks.md             # /speckit.tasks 산출 (본 단계 아님)
```

### Source Code (repository root)

```text
src/components/trip/
├── TripDetailLayout.tsx     # 모바일 sticky 영역·스와이프 커밋·캘린더 강조 갱신
├── SwipeCarousel.tsx        # 스와이프 커밋 타이밍(미로딩 즉시 이동·강조 동기화)
├── DayActivitiesPane.tsx    # 일정 섹션 상단 날짜 헤더 제거
└── __tests__/               # 회귀 테스트(스와이프·헤더·버튼)

src/components/calendar/
└── CalendarView*            # 선택 강조 갱신 타이밍 확인(소비 측)
```

**Structure Decision**: 기존 모바일 트립 상세 컴포넌트군을 그대로 사용하고 신규 디렉토리를 만들지 않는다. 스크롤 정지·스와이프 커밋·헤더·버튼 변경 모두 위 3개 컴포넌트 내부에서 처리한다.

## Complexity Tracking

> Constitution Check 위반 없음 — 해당 없음.
