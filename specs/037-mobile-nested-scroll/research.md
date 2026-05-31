# Research: 모바일 트립 상세 단일 스크롤 + 캘린더 경계 1회 멈춤 (GSAP)

**Feature**: 037-mobile-nested-scroll
**Date**: 2026-05-31

## 결정 1 — GSAP ScrollTrigger snap (단일 스크롤 유지)

**Decision**: 모바일(<1024px) 트립 상세를 단일 document 스크롤로 두고 캘린더는 `position: sticky`로 고정한다. 헤더가 사라져 캘린더가 고정되는 경계(`sticky.offsetTop`) 한 지점에서만 GSAP `ScrollTrigger`의 `snap`으로 멈춘다. `snapTo`는 헤더 구간(0~경계)에서만 0 또는 경계로 보내고, 경계 이후 일정 구간은 현재 위치를 그대로 반환해 자유 스크롤을 보존한다. `gsap.matchMedia("(max-width: 1023px)")`로 모바일에서만 켜고, cleanup에서 revert한다.

**Rationale**:
- 사용자 요구: ① 어디를 스크롤해도 동일(단일 스크롤) ② 캘린더 경계에서 벽처럼 멈춤 ③ 네이티브 속도.
- CSS scroll-snap은 ②를 줄 수 없다 — "스크롤이 멈춘 뒤 가까운 점으로 당김(오버슈트 후 복귀)"이 정의된 동작이라, 사용자가 dev에서 본 "지나쳤다 되돌아옴"이 그것이다. snap-back은 제거 불가.
- GSAP `ScrollTrigger.snap`은 `snapTo`를 함수로 줄 수 있어 "헤더 구간만 정지점, 일정 구간은 자유"를 프로그래밍할 수 있다. `duration`을 짧게(0.12) 둬 복귀를 최소화해 "벽"에 가깝게 만든다.
- 단일 document 스크롤을 그대로 쓰므로 "어디를 만지든 동일"이 유지된다(중첩 스크롤의 손가락 위치 문제 없음).

**Alternatives considered**:
- **CSS scroll-snap (proximity/mandatory/snap-stop)** — v3.8.0~v3.8.2 + 037 1차. snap-back으로 "지나쳤다 복귀". 기각.
- **중첩 스크롤(overscroll-contain)** — 손가락 위치마다 스크롤 주체가 갈려 "어디든 동일" 위배. 기각(037 2차 철회).
- **GSAP normalizeScroll** — 모바일 스크롤을 JS 스레드로 가져와 pin 지터를 막지만 네이티브 관성을 JS가 대체해 속도감이 바뀐다. 1차로는 쓰지 않고, 지터가 심하면 그때 검토.
- **CSS scroll-driven animations** — 스크롤 연동 시각효과지 "스크롤을 멈추는 벽"이 아니라 요구와 다름. 기각.

## 결정 2 — 기존 화면 순서 유지

**Decision**: `page.tsx`의 여행 헤더 → 캘린더(sticky) → 일정 순서를 그대로 둔다. 단일 document 스크롤이라 헤더가 사라지고 캘린더가 고정되는 흐름이 자연히 1단계다. 변경은 `TripDetailLayout.tsx`(GSAP 등록·snap)와 `globals.css`(이전 trip-snap 제거)에 한정.

## 결정 3 — 좌우 날짜 스와이프 공존

**Decision**: `SwipeCarousel`(embla)은 현행 `touch-pan-y`를 유지한다. 세로 제스처는 document 스크롤로, 가로는 embla로. GSAP snap은 스크롤 종료 시점에만 개입하므로 가로 스와이프와 충돌하지 않는다.

## 결정 4 — 검증은 실기기 정본

**Decision**: snap 거동·속도감은 실기기(모바일 브라우저) 수동 확인이 정본. 자동 테스트(vitest+jsdom)는 컴포넌트 렌더·데스크탑 무영향·`touch-pan-y` 유지만 검증한다(ScrollTrigger는 스크롤·레이아웃 엔진이 필요해 jsdom 미검증).

## 미해결/리스크 (실기기로 확인)

- GSAP snap의 `duration: 0.12`가 "벽"으로 충분히 즉각적인지, 아니면 여전히 복귀가 보이는지. 보이면 duration 추가 단축 또는 onUpdate 클램프 검토.
- 모바일 빠른 fling에서 ScrollTrigger snap의 지터 여부. 심하면 `normalizeScroll` 도입(관성 트레이드오프) 검토.
- GSAP 모듈 레벨 `registerPlugin`의 SSR(Next 서버 렌더) 안전성 — `"use client"` + `useGSAP`이 가드하나 Vercel 빌드로 확인.
- iOS Safari 위치 오보고로 인한 경계 흔들림.
