/**
 * spec 024 (#416) — Provider registry.
 *
 * 라우트·service 계층은 link row의 `provider`를 읽어 본 함수로 구현체를 받는다.
 * Apple 구현체는 후속 #417에서 추가됨 — 현재는 throw로 명확한 신호 제공.
 */

import type { CalendarProvider, ProviderId } from "./types";
import { googleProvider } from "./google";

export function getProvider(id: ProviderId): CalendarProvider {
  switch (id) {
    case "GOOGLE":
      return googleProvider;
    case "APPLE":
      throw new Error(
        "Apple calendar provider is not implemented yet (#417 apple-caldav-provider). " +
          "본 피처(#416)는 추상화 토대만 도입한다.",
      );
    default: {
      const _exhaustive: never = id;
      throw new Error(`Unknown provider id: ${String(_exhaustive)}`);
    }
  }
}
