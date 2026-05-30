import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// #657 — embla-carousel 은 초기화 시 window.matchMedia 를 호출한다. jsdom 은
// matchMedia 를 구현하지 않아 SwipeCarousel 렌더가 크래시하므로 폴리필을 둔다.
// (jsdom 에는 레이아웃/스크롤이 없어 캐러셀 인터랙션 자체는 검증 불가 — 마운트·
// 구조만 보장한다. 실제 제스처는 실기기 확인 영역.)
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// embla 는 IntersectionObserver / ResizeObserver 도 쓴다. jsdom 미구현 → no-op 스텁.
if (typeof globalThis !== "undefined") {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g.IntersectionObserver) g.IntersectionObserver = NoopObserver;
  if (!g.ResizeObserver) g.ResizeObserver = NoopObserver;
}

// #581 — CI coverage 환경에서 base-ui Dialog portal 마운트 / React useEffect →
// fetch mock → state 업데이트 → 트리거 렌더 사이의 timing 누적으로 testing-library
// 기본 1000ms findByRole / waitFor timeout 안에 들지 못해 간헐 실패 (flaky).
// asyncUtilTimeout 을 3000ms 로 늘려 같은 commit 재실행 의존을 제거한다. 실제
// 컴포넌트 동작 변경 없음 — CI render 지연 흡수만.
configure({ asyncUtilTimeout: 3000 });
