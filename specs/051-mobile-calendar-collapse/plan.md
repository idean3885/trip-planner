---
description: "Plan for spec 051 — 모바일 캘린더 스크롤 접힘"
---

# Plan: 모바일 캘린더 스크롤 접힘

## Coverage Targets

- 스크롤로 캘린더 상단 고정 시 월→주 자동 접힘 + 맨 위 복귀 시 월간 복원 [why: scroll-collapse] [multi-step: 2]
- 좁은 폭(약 320px)~큰 폭 캘린더·주간 스트립 레이아웃 유지 [why: responsive]

## Technical Context

- 프런트: Next.js 16, React 19, Tailwind v4. 신규 의존성 없음.
- **상단 고정 감지**: `TripDetailLayout` 모바일 sticky 캘린더 바로 위에 sentinel 요소를
  두고 `IntersectionObserver`로 관측한다. sentinel이 화면 위로 사라지면(스크롤 다운)
  캘린더가 sticky 로 고정된 것 → `isStuck=true`. 스크롤·resize 없이 관측자로만 판정해
  성능 부담을 줄인다. 데스크탑은 모바일 분기(lg:hidden) 안에만 있어 무영향.
- **접힘 전달**: `CalendarView`에 `collapsed?: boolean` prop 추가 →
  `MobileCompactCalendar`로 전달. `collapsed`면 표시 뷰를 주간으로 강제하고(effectiveView
  = collapsed ? "week" : 사용자 토글 view), 자동 제어 중에는 수동 토글 버튼을 숨긴다.
  `collapsed=false`로 돌아오면 월간(또는 사용자 토글값)으로 복원.
- **반응형**: 월간 셀은 `Calendar` root `w-full` + 7등분(flex-1, aspect-square)이라 폭에
  비례. 주간 스트립(`WeekStrip`)은 `flex w-full` + 셀 `flex-1`이라 폭에 비례. 320px 에서
  gap·폰트가 넘치지 않는지 확인하고 필요한 최소 조정만 한다(고정폭·과한 패딩 제거).
- 기존 스와이프(월↔월·주↔주)·탭 토글은 유지. 자동 접힘은 그 위에 얹는 신호.

## Risks

- 스크롤·sticky 거동은 로컬 빌드 제약(os)으로 정적·단위 검증 + 실기기 후속.
- IntersectionObserver는 jsdom 스텁 환경이라, 단위테스트는 `collapsed` prop→주간 렌더
  경로를 직접 검증한다(관측자 발화 자체는 실기기 정본).
