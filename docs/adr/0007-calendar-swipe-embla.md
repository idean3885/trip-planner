# ADR 0007: 캘린더·일정 스와이프 모션 엔진으로 embla-carousel 채택

- **Status**: Accepted (2026-05-30, v3.6.0)
- **Context**: 이슈 [#657](https://github.com/idean3885/trip-planner/issues/657)
- **Related**: ADR 0002 library-first-policy, #649(touch-action 세로 스크롤 회귀)

## Context

모바일 캘린더(월/주)와 하단 일정 섹션에 좌우 스와이프 기간 이동을 넣되, "누른 채 끌면 앞뒤가 보이고(peek) 손을 떼면 부드럽게 넘어가는" 드래그-팔로우 모션을 원했다.

이전 시도(자체 터치 핸들러, #653)는 손을 뗀 뒤에야 바뀌는 비연속 전환이라 핍·관성이 없었다. 또한 세로 스와이프 토글 시도(#637~#649)에서 `touch-action: pan-x`가 sticky 캘린더 위 세로 스크롤을 막는 치명적 회귀가 났다.

세 가지 방향을 검토했다.

1. **embla-carousel** — shadcn Carousel 이 쓰는 드래그 엔진. 드래그-팔로우·스냅·핍 기본 제공.
2. **framer-motion** — `drag="x"` 로 직접 구현. 의존성이 더 크고(수십 kb) 캐러셀 정형 패턴은 직접 만들어야 함.
3. **자체 transform** — 무의존이나 관성·경계·성능 튜닝을 직접 해야 하고 검증 비용이 큼.

## Decision

**(1) embla-carousel 을 채택한다.** ADR 0002(library-first) 에 따라 정식·활발 관리·shadcn 레퍼런스가 있는 라이브러리를 기본값으로 둔다.

세부 결정:

- **3슬라이드(이전·현재·다음) + 무한 내비.** 옆 슬라이드로 정착하면 기준 기간을 한 칸 옮기고(`onCommit`), `useLayoutEffect` 로 paint 전에 가운데로 무애니메이션 복귀한다. 정착 슬라이드와 새 가운데의 내용이 같아 점프가 보이지 않는다.
- **가로 전용.** `touch-action: pan-y` 를 함께 줘 세로 페이지 스크롤은 브라우저가 그대로 처리한다 — `pan-x`/`none` 은 금지(#649 회귀 방지).
- **재사용 프리미티브 `SwipeCarousel`.** 월·주·일이 같은 컴포넌트를 `renderSlide(offset)` + `onCommit(dir)` 로 공유한다.
- **월↔주 전환은 탭 토글 버튼 유지.** 세로 스와이프 토글은 채택하지 않는다(#649).

## Consequences

- 의존성 1개 추가(`embla-carousel-react`, 순수 JS — 플랫폼 네이티브 바이너리 없음).
- jsdom 에는 레이아웃/스크롤·IntersectionObserver·matchMedia 가 없어 캐러셀 인터랙션 자체는 단위 테스트로 검증 불가. 마운트·슬라이드 구조·커밋 배선만 테스트하고 실제 제스처 체감은 실기기 확인 영역으로 둔다. 테스트 환경에는 해당 브라우저 API no-op 스텁을 둔다.
