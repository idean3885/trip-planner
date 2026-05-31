# Research: 모바일 트립 상세 2단계 분리 스크롤

**Feature**: 037-mobile-nested-scroll
**Date**: 2026-05-31

## 결정 1 — 중첩 스크롤(nested scrolling) 구조 채택

**Decision**: 모바일(<1024px) 트립 상세를 고정 높이 뷰포트 컨테이너로 두고, 그 안에 (1) 여행 요약 헤더, (2) sticky 캘린더, (3) 자체 스크롤 일정 영역을 배치한다. 일정 영역에 `overflow-y: auto` + `overscroll-behavior: contain`을 준다.

**Rationale**:
- 사용자가 원하는 동작은 "헤더가 사라져 캘린더가 고정될 때까지 1단계 → 경계 멈춤 → 일정만 2단계"다. 이는 collapsing header + nested scroll 패턴(구글/iOS 캘린더 앱)이다.
- `overscroll-behavior: contain`이 일정 영역 끝에서 바깥(페이지)으로 스크롤이 연쇄(scroll chaining)되는 것을 끊는다. 이 "끊김"이 곧 사용자가 말한 "경계에서 한 번 멈춤"이다 — 손을 떼고 다시 스크롤해야 다음 영역으로 넘어간다.
- 스크롤 속도는 네이티브 그대로 유지된다(snap·감속 없음, FR-008). v3.8.0~v3.8.2의 scroll-snap이 속도를 방해했던 문제를 구조적으로 회피한다.

**Alternatives considered**:
- **scroll-snap (proximity/mandatory/snap-stop)** — v3.8.0~v3.8.2에서 3회 시도·철회. 빠른 자유 스크롤과 상충, 속도 방해. 기각.
- **JS 스크롤 하이재킹**(휠/터치 이벤트 가로채 단계 전환) — 네이티브 관성·고무줄 동작을 깨고 기기별 편차가 크다. 과거 touch-action 회귀(#649) 전례. 1차로는 CSS 중첩 스크롤만 쓰고, 실기기에서 경계 동작이 부족하면 그때 최소 보강을 검토한다.

## 결정 2 — 모바일 레이아웃 재구성 (헤더를 컨테이너 안으로)

**Decision**: 모바일에서 여행 요약 헤더(제목·기간·동행자 요약·자세히 진입)를 트립 상세 컨테이너 안 캘린더 위에 둔다. 현재 `page.tsx`의 헤더(제목·기간·액션 버튼)는 데스크탑 전용으로 두고, 모바일은 컨테이너 내부 요약 헤더가 1단계 스크롤 대상이 된다.

**Rationale**:
- 현재 여행 헤더는 `TripDetailLayout` 바깥(`page.tsx`)에 있고 페이지 전체가 document 스크롤이다. 중첩 스크롤은 "헤더+캘린더+일정"을 하나의 고정 높이 컨테이너로 묶어야 성립한다.
- 컨테이너 높이는 동적 뷰포트 단위(`100dvh`)에서 글로벌 상단 헤더 높이를 뺀 값으로 둔다. 모바일 주소창 노출/숨김에 따른 높이 변화를 `dvh`가 흡수한다(Edge Case 대응).
- 일정 영역 높이는 컨테이너에서 캘린더(sticky) 높이를 뺀 가용 높이다. 캘린더 높이는 월↔주 토글로 바뀌므로 동적으로 반영한다.

**Alternatives considered**:
- **page.tsx 그대로(헤더 바깥 유지) + 일정만 자체 스크롤** — 헤더가 컨테이너 밖이면 "헤더가 1단계로 사라지고 캘린더가 그 자리에 고정"되는 경계가 깔끔히 안 잡힌다. 기각.

## 결정 3 — 좌우 날짜 스와이프 공존

**Decision**: 일정 영역의 좌우 스와이프(`SwipeCarousel`, embla)는 현행 `touch-pan-y`를 유지한다. 세로 스크롤은 일정 영역 래퍼(중첩 스크롤 컨테이너)가 받고, 가로 스와이프는 그 안의 embla가 받는다.

**Rationale**:
- `SwipeCarousel`은 이미 `touch-pan-y`로 "세로 제스처는 브라우저(=세로 스크롤 컨테이너)에 넘기고, 가로만 처리"한다(#649 회귀 방지 설계). 세로 스크롤 주체가 document에서 일정 래퍼로 바뀌어도 이 분담은 유지된다.
- 큰 인터랙션 영역에 좁은 `touch-action`을 강제하지 않는다(#649 교훈: sticky 위 세로 스크롤을 막았던 회귀 재발 방지).

**Alternatives considered**:
- 일정 래퍼에 `touch-action: pan-y` 강제 — embla 가로 제스처를 막을 위험. 기각, 현행 분담 유지.

## 결정 4 — 검증은 실기기 정본

**Decision**: 단계 분리·경계 멈춤·좌우 스와이프 거동은 실기기(모바일 브라우저, trip.idean.me 프리뷰/프로덕션) 수동 확인을 정본으로 둔다. 자동 테스트(vitest+jsdom)는 레이아웃 구조(DOM·className 존재)와 데스크탑 무영향 회귀만 검증한다.

**Rationale**:
- jsdom에는 스크롤·레이아웃 엔진이 없어 `overscroll-behavior`·sticky·nested scroll 거동을 재현하지 못한다(과거 spec 036에서도 동일).
- 브라우저별(특히 iOS Safari 고무줄, Chrome Android) nested scroll·chaining 동작 편차가 있어 실기기 확인이 필수다.

## 미해결/리스크 (구현 중 실기기로 확인)

- iOS Safari에서 `overscroll-behavior: contain`의 chaining 차단이 기대대로 "한 번 멈춤"을 주는지.
- 바깥(헤더 스크롤)→안쪽(일정) 전환이 한 제스처에서 자연스럽게 끊기는지(손가락 위치에 따른 편차).
- `100dvh` 컨테이너에서 글로벌 헤더·하단 여백과의 높이 합산이 어긋나 일정 영역이 잘리거나 남지 않는지.
