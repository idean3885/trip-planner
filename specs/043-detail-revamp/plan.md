---
description: "Plan for spec 043 — 여행 상세 화면 정비"
---

# Plan: 여행 상세 화면 정비

## Coverage Targets

- 여행 기간 직접 편집 + 축소 시 손실 활동 경고/확인 (기간 set API + 편집 다이얼로그) [why: period-edit] [multi-step: 3]
- 헤더 브레드크럼 날짜 + 액션바 한 줄 통합 + 선택 일자 삭제 노출 + 캘린더 가로/세로 정비 [why: layout] [multi-step: 4]
- 캘린더 동기화 진입 단계 축소(중간 열기 제거) [why: calsync] [multi-step: 2]
- 경계 멈춤 스크롤 데스크탑·모바일 공통 동작 + 일정 패널 높이 선택 일자 기준 [why: scroll] [multi-step: 2]
- 선택 일자 URL 동기화(쿼리 파라미터 + 진입 복원) [why: urlsync] [multi-step: 2]

## Technical Context

- 프런트: Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui(vendored Dialog/Button).
- 여행 기간은 `getResolvedPeriod`(Day min/max 파생, 명목 컬럼 없음, spec 029). 기간 편집은
  **새 엔드포인트 `PUT /api/trips/[id]/period`**로 처리한다. body `{ startDate, endDate, confirm? }`.
  트랜잭션에서 (1) 새 범위 밖 Day 중 활동 보유분 계산 → `confirm!==true`면 409 + `wouldDelete`
  요약 반환(삭제 안 함), (2) confirm 또는 손실 없음이면 범위 밖 Day 삭제(cascade) + 경계
  날짜(start/end) Day 미존재 시 생성. 기존 `getDerivedPeriodTx` 재사용. **스키마 변경·마이그레이션 없음.**
- 액션바는 `selectedDate`(클라이언트 상태)에 의존하는 선택 일자 삭제를 포함하므로
  `TripDetailLayout`(클라이언트)로 이동한다. `page.tsx`(서버)는 브레드크럼(+기간 날짜)만 남긴다.
  역할 분기(OWNER/GUEST)를 위해 `isOwner`/`canEdit` prop을 넘긴다. 기존 버튼 컴포넌트
  (InviteButton/DeleteTripButton/LeaveTripButton)는 클라이언트라 그대로 재사용.
- `DayDeleteButton`은 이미 완성(미마운트). 선택 일자의 dayId가 있을 때만 노출/활성.
- 캘린더 폭: `CalendarView`/`ui/calendar.tsx`의 가로 grow를 최대폭 + 좌우 여백 + 세로 max-height로
  조정. 셀 정사각 유지하되 컨테이너 max-width로 빈 가로 여백 제거.
- 동기화: `CalendarSyncEntryCard`의 [열기] 단계를 제거하고 다이얼로그 진입 즉시 섹션 노출.
  데스크탑 좌측 카드/모바일 다이얼로그 모두 동일 동선으로 정리.
- 경계 멈춤 스크롤: 현 GSAP ScrollTrigger snap이 vh 근사 + 모바일 전용이라 양쪽 다 미동작.
  경계 기준을 sticky 요소의 실측 위치(offsetTop)로 고정하고, 데스크탑·모바일 공통으로 적용한다.
  뷰포트 근사가 불안정하면 실측 고정값으로 폴백.
- 패널 높이: `SwipeCarousel` 트랙이 `items-start`임에도 빈 스크롤이 남는 원인(슬라이드 강제 동일
  높이/컨테이너 min-height)을 제거해 현재 일자 콘텐츠 높이에 맞춘다.
- URL 동기화: `selectedDate`를 쿼리 파라미터(`?d=YYYY-MM-DD`)로 반영(shallow). 진입 시 쿼리에서
  복원하고, 없으면 기존 `computeInitialSelected` 기본값.

## Risks

- 시각·스크롤 동작은 로컬 빌드 불가(os 제약)로 정적·단위 검증 + 스크린샷 후속 확인.
- 액션바 이동으로 `page.tsx`/`TripDetailLayout` 경계가 바뀌므로 권한 분기 회귀 주의.
