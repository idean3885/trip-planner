# Implementation Plan: 여행 상세 캘린더 중심 단일 화면 재설계

**Branch**: `032-calendar-centric-detail` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-calendar-centric-detail/spec.md`

## Summary

`/trips/[id]` 상세를 캘린더 중심 단일 화면으로 바꾼다. 캘린더 셀 클릭을 `router.push`(Day 페이지 이동)에서 클라이언트 선택 상태(`selectedDate`) 갱신으로 교체하고, 선택 날짜의 일정을 같은 화면 패널에서 조회·추가·수정·삭제한다. 일정 CRUD 후 캘린더의 일정 유무 표시와 패널이 함께 갱신되도록 days 데이터를 `TripDetailLayout` 클라이언트 상태로 끌어올린다. 데스크탑(≥1024px)은 좌측(캘린더 확대 + 동기화 카드) / 우측(동행자 + 선택 일정) 2분할, 모바일(<1024px)은 sticky 캘린더(위로 스와이프 시 선택 주로 압축) + 선택 일정으로 배치하고 동기화·동행자는 `자세히` 진입점에 모은다. DayList와 Day 상세 페이지(`/trips/[id]/day/[dayId]`)를 제거한다.

## Coverage Targets

- 캘린더 셀 클릭을 클라이언트 선택 상태로 전환(router.push 제거) + days 상태 리프팅 [why: inline-select] [multi-step: 2]
- 선택 날짜 일정 패널 인라인 CRUD(추가·수정·삭제) + 빈 날짜 Day 자동 생성 [why: inline-activity-crud] [multi-step: 3]
- 데스크탑 2분할 재배치(좌: 캘린더+동기화, 우: 동행자+선택 일정) + 캘린더 영역 확대 [why: desktop-layout] [multi-step: 2]
- 모바일 sticky 캘린더 + 월↔주 스와이프 압축 [why: mobile-calendar] [multi-step: 2]
- 모바일 동기화·동행자 `자세히` 진입점 [why: mobile-detail-entry]
- Day 상세 페이지 제거 + `/trips/[id]`로 리다이렉트 [why: day-route-removal]
- DayList 제거 [why: daylist-removal]
- 단편 / 검증 / 회귀 테스트 [why: release-bookkeeping]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Next.js 16 (App Router · Turbopack), React 19, Prisma 7 (Neon Postgres adapter), Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored), `react-swipeable`(기존 의존성, MobileSwipeShell에서 사용 중), lucide-react. **신규 의존성 도입 없음**.  
**Storage**: Neon Postgres — **스키마 변경 없음**. 기존 `Trip` / `Day` / `Activity` / `TripCalendarLink` / `TripMember` 참조만. 일정 CRUD는 기존 REST 경로(`/api/trips/[id]/days/[dayId]/activities`, `/api/trips/[id]/days`) 재사용.  
**Testing**: Vitest + Testing Library. 변경 컴포넌트 단위/상호작용 테스트 + spec 031 회귀 테스트 갱신. 서브밋 전 `npx vitest run` 전체 1회 의무.  
**Target Platform**: 브라우저 — 데스크탑(≥1024px) 2분할 / 모바일(<1024px) 세로. 두 모드 모두 1차 대상.  
**Project Type**: Web application (Next.js 단일 프로젝트, `src/` + `mcp/`)  
**Performance Goals**: 날짜 선택 시 패널 갱신은 클라이언트 상태 변경으로 즉시(네트워크 0회). 일정 CRUD만 네트워크 왕복.  
**Constraints**: 데이터 스키마 변경 0건. 신규 패키지 0건. MCP 도구 영향 0건.  
**Scale/Scope**: 한 여행 평균 일자 ≤ 30, 일자별 일정 ≤ 20 가정 — 클라이언트 상태·DOM 부담 미미.

## Constitution Check

UI·라우팅 변경이라 헌법 V(마이그레이션 expand-and-contract) 해당 없음(스키마 변경 0). VI(데이터 정본)도 기존 Activity·Day 조작 경로를 그대로 재사용하므로 정본 위반 없음. CSS 토큰은 spec 012 `@theme` 정본 사용. rollout phase=contract → quickstart Evidence 필수.

## 핵심 설계 결정

### D1. 선택 상태 리프팅 (router.push 제거)
현재 `TripDetailLayout`은 거의 무상태이고 셀 클릭 시 `router.push(/day/[dayId])`로 이동한다. 본 피처는 `selectedDate`와 `days`(activities 포함)를 `TripDetailLayout`의 클라이언트 상태로 끌어올린다. 캘린더 셀 클릭은 `setSelectedDate`만 호출한다. 일정 CRUD 결과를 days 상태에 반영하면 캘린더의 일정 유무 표시와 선택 패널이 같은 소스로 함께 갱신된다. 초기 `selectedDate`는 여행 기간 내 오늘(없으면 첫날)로 계산(`src/lib/trip-period.ts` derived 기간 사용).

### D2. 선택 날짜 일정 패널의 인라인 CRUD
기존 `DayActivitiesPane`은 조회 전용(일정 항목이 Day 페이지로 Link, AddDayButton만 제공)이다. 본 피처는 선택 날짜 패널을 편집 가능하게 한다. 기존 `ActivityList`(client state로 CRUD 보유)를 선택 날짜 패널에 통합하고, 선택 날짜에 매칭 Day가 없으면 "일정 추가" 시 먼저 Day를 생성(`POST /days`)한 뒤 일정을 추가한다. CRUD 콜백은 상위 days 상태도 갱신해 캘린더 표시와 동기화한다.

### D3. 데스크탑/모바일 레이아웃
- 데스크탑(≥1024px): `page.tsx` 본문을 2열 grid 유지. 좌측 컬럼 = 캘린더(컬럼 폭 채움) + 동기화 카드, 우측 컬럼 = 동행자 + 선택 날짜 일정. 기존 `SidePanel`(동기화+동행자 묶음)을 해체해 좌/우로 분산 배치.
- 모바일(<1024px): 캘린더 상단 sticky + 선택 날짜 일정. 동기화·동행자는 `자세히`(shadcn `Sheet` 또는 `Collapsible` 진입점)에 모은다.

### D4. 모바일 월↔주 압축
`react-swipeable`의 `onSwipedUp`/`onSwipedDown`으로 캘린더 표시 모드(`month`↔`week`)를 토글한다. 주 모드는 선택 날짜가 속한 한 주만 렌더한다(react-day-picker 표시 범위 제어). sticky 컨테이너로 스크롤 시 캘린더를 상단 고정한다. 기존 `MobileSwipeShell`(좌우 스와이프 view swap)과는 다른 제스처라 캘린더 전용 래퍼에서 처리한다.

### D5. Day 페이지 제거
`src/app/trips/[id]/day/[dayId]/page.tsx`를 `redirect("/trips/[id]")`로 교체한다. 기존 북마크·외부 링크가 깨지지 않게 상세로 보낸다. `DayActivitiesPane`·기타에서 Day 페이지로 향하던 `Link`를 제거한다.

## Project Structure

### Documentation (this feature)

```text
specs/032-calendar-centric-detail/
├── plan.md
├── spec.md
├── tasks.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   └── trips/
│       └── [id]/
│           ├── page.tsx               # 2분할 재배치: 좌(캘린더+동기화)/우(동행자+선택 일정), SidePanel 해체
│           ├── SidePanel.tsx          # 데스크탑 배치 분산에 맞춰 해체 또는 좌/우 슬롯 컴포넌트로 재구성
│           └── day/[dayId]/page.tsx   # redirect(/trips/[id]) 로 교체 (라우트 제거)
├── components/
│   ├── trip/
│   │   ├── TripDetailLayout.tsx       # 선택 상태/days 리프팅, DayList 제거, 캘린더+선택 패널 오케스트레이션
│   │   ├── CalendarView.tsx           # 모바일 sticky + 월↔주 모드 prop, 셀 클릭 onSelect만(라우팅 제거)
│   │   ├── DayActivitiesPane.tsx      # 선택 날짜 패널 — 인라인 CRUD(ActivityList 통합) 로 확장, day Link 제거
│   │   └── MobileSwipeShell.tsx       # (참조) 월/주 압축은 캘린더 래퍼에서 별도 처리
│   ├── ActivityList.tsx               # 선택 패널에 통합, CRUD 콜백으로 상위 days 상태 갱신
│   └── MemberList.tsx                 # 데스크탑 우측 상단 / 모바일 자세히 진입점에 배치
└── lib/
    └── trip-period.ts                 # 초기 선택일(여행 기간 내 오늘/첫날) 계산에 derived 기간 사용
```

**Structure Decision**: 단일 Next.js 프로젝트 유지. 신규 컴포넌트는 모바일 `자세히` 진입점 래퍼 정도로 최소화하고, 나머지는 기존 컴포넌트(`TripDetailLayout`·`CalendarView`·`DayActivitiesPane`·`ActivityList`) 확장으로 처리한다. Day 페이지는 redirect로 축소.

## Complexity Tracking

위반 사항 없음. 신규 추상·신규 패키지 도입 없음. 가장 복잡한 부분(모바일 월↔주 스와이프)은 기존 `react-swipeable` 의존성으로 처리한다.
</content>
