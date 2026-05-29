import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// #581 — CI coverage 환경에서 base-ui Dialog portal 마운트 / React useEffect →
// fetch mock → state 업데이트 → 트리거 렌더 사이의 timing 누적으로 testing-library
// 기본 1000ms findByRole / waitFor timeout 안에 들지 못해 간헐 실패 (flaky).
// asyncUtilTimeout 을 3000ms 로 늘려 같은 commit 재실행 의존을 제거한다. 실제
// 컴포넌트 동작 변경 없음 — CI render 지연 흡수만.
configure({ asyncUtilTimeout: 3000 });
