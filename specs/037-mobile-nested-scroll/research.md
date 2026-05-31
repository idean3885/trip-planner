# Research: 모바일 트립 상세 단일 스크롤 + 캘린더 경계 1회 멈춤

**Feature**: 037-mobile-nested-scroll
**Date**: 2026-05-31

## 결정 1 — 단일 스크롤 + 캘린더 경계 1점 scroll-snap

**Decision**: 모바일(<1024px) 트립 상세를 단일 document 스크롤로 두고, 캘린더는 `position: sticky`로 상단 고정한다. 일정 패널 상단 **한 곳에만** 정지점(`scroll-snap-align: start` + `scroll-snap-stop: always`)을 두고, 스크롤 컨테이너(html)에 `scroll-snap-type: y proximity`와 `scroll-behavior: auto`를 모바일 한정으로 적용한다. 정지 위치는 `scroll-margin-top`을 캘린더 높이(`--trip-cal-h`)로 맞춘다.

**Rationale**:
- 사용자 요구의 핵심은 "어느 영역을 스크롤해도 동일" = **단일 스크롤**이다. 손가락이 헤더·캘린더·일정 어디 위에 있든 같은 document 스크롤이 움직인다.
- 단계 멈춤은 "캘린더가 고정되는 경계 한 지점"에서만 필요하다. 일정 패널 상단에 정지점 하나를 두고 `scroll-snap-stop: always`로 빠른 fling 도 이 지점을 건너뛰지 못하게 한다. 일정 목록 내부는 정지점이 없어 자유 스크롤이다.
- `scroll-behavior: auto`가 핵심이다. v3.8.1에서 snap 이 느렸던 원인은 전역 `scroll-behavior: smooth`가 snap 복귀에 적용돼 정지점으로 천천히 미끄러진 것이었다. auto 로 두면 snap 이 즉시 끝나 네이티브 속도를 유지한다(이 조합은 직전 세 버전에서 시도되지 않았다).

**Alternatives considered**:
- **중첩 스크롤(일정 자체 overflow 영역 + `overscroll-behavior: contain`)** — 본 피처 1차 구현(037 초안)으로 dev 검증했으나, 손가락이 일정 영역 위/밖이냐에 따라 스크롤 주체가 갈려 "어디를 스크롤해도 동일"을 위배했다. 캘린더 sticky 높이에 따라 일정 영역 높이가 달라져 동작도 들쭉날쭉했다. 철회.
- **scroll-snap mandatory** — 일정 목록 중간 스크롤까지 정지점으로 끌어당겨 자유 스크롤을 방해. proximity + 단일 정지점으로 대체.
- **JS 스크롤 하이재킹** — 네이티브 관성·고무줄을 깨고 기기별 편차 큼(#649 전례). 기각.

## 결정 2 — 기존 화면 순서 유지 (레이아웃 재구성 없음)

**Decision**: `page.tsx`의 여행 헤더(제목·기간·액션) → `TripDetailLayout`의 캘린더(sticky) → 일정 순서를 그대로 둔다. 헤더를 컨테이너 안으로 옮기거나 데스크탑 전용으로 분기하지 않는다.

**Rationale**: 단일 document 스크롤이므로 기존 DOM 순서가 이미 "헤더 → 캘린더(sticky) → 일정"이다. 헤더가 document 스크롤로 사라지고 캘린더가 `sticky top-0`에 고정되는 흐름이 자연히 1단계가 된다. 변경은 `TripDetailLayout.tsx`(정지점·높이 측정·snap 클래스)와 `globals.css`(trip-snap 미디어쿼리)에 한정된다.

## 결정 3 — 좌우 날짜 스와이프 공존

**Decision**: 일정 영역의 `SwipeCarousel`(embla)은 현행 `touch-pan-y`를 유지한다. 세로 제스처는 document 스크롤로, 가로 제스처는 embla로 간다.

**Rationale**: `touch-pan-y`가 "가로만 처리, 세로는 브라우저(document)에 위임"하므로 단일 스크롤과 그대로 공존한다. 큰 영역에 좁은 `touch-action`을 강제하지 않는다(#649 회귀 방지).

## 결정 4 — 검증은 실기기 정본

**Decision**: 단계 멈춤·경계 거동은 실기기(모바일 브라우저, dev.trip.idean.me / 프리뷰) 수동 확인을 정본으로 둔다. 자동 테스트(vitest+jsdom)는 레이아웃 구조(정지점 클래스·snap 클래스·데스크탑 무영향)만 검증한다.

**Rationale**: jsdom에는 스크롤·레이아웃·scroll-snap 엔진이 없다. 브라우저별(특히 iOS Safari) snap·고무줄 동작 편차가 있어 실기기가 필수다.

## 미해결/리스크 (실기기로 확인)

- `scroll-snap-stop: always` + `scroll-behavior: auto` 조합이 iOS Safari·Chrome Android에서 "빠른 속도 유지 + 경계 1회 멈춤"을 실제로 주는지. (직전 세 버전 철회 이력 — 같은 증상 재발 시 정지점/타입 재조정 또는 멈춤 포기 검토.)
- proximity 정지점이 너무 약해 fling 에서 무시되면 `snap-stop: always`로 보강되는지, 아니면 여전히 약한지.
