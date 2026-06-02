# 커스텀 훅 인벤토리 점검 (spec 042)

조사일 2026-06-02. `src/` 전체 `use-*`/`useXxx` 커스텀 훅 현황.

## 결과

- **전용 커스텀 훅 파일 없음**. `src/hooks/` 디렉토리는 존재하지 않고, `components.json`에 `@/hooks` 별칭만 정의돼 있다.
- React 표준 훅(`useState`/`useEffect`/`useCallback`/`useRef`/`useLayoutEffect`/`useMemo`)은 각 컴포넌트에서 직접 사용한다.
- `use-mobile`(useIsMobile)·`use-toast` 같은 흔한 커스텀 훅은 **없다**:
  - 토스트는 Sonner(`@/components/ui/sonner` + `toast`)가 담당 — 별도 `use-toast` 불필요.
  - 모바일 판별은 컴포넌트별 Tailwind 분기(`lg:hidden` 등)·GSAP matchMedia로 처리 — 공용 훅 도입은 보류(중복·미사용 훅을 만들지 않음).

## 정비 결론

- 중복·미사용 커스텀 훅 없음 — 정리 대상 없음.
- 제스처 라이브러리는 embla-carousel(SwipeCarousel) 단일로 모음(react-swipeable·MobileSwipeShell 제거, US2).
- 향후 모바일 판별을 여러 곳에서 쓰게 되면 그때 단일 `useIsMobile` 훅(또는 well-known 라이브러리)을 도입한다 — 현재는 불필요.
