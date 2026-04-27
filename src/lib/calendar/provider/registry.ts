/**
 * spec 024 (#416) — Provider registry. spec 025 (#417)에서 Apple 활성화.
 *
 * 라우트·service 계층은 link row의 `provider`를 읽어 본 함수로 구현체를 받는다.
 * GOOGLE은 v2.8.0~ 운영, APPLE은 v2.11.0(spec 025)에서 활성화됨.
 */

import type { CalendarProvider, ProviderId } from "./types";
import { googleProvider } from "./google";
import { appleProvider } from "./apple";

export function getProvider(id: ProviderId): CalendarProvider {
  switch (id) {
    case "GOOGLE":
      return googleProvider;
    case "APPLE":
      return appleProvider;
    default: {
      const _exhaustive: never = id;
      throw new Error(`Unknown provider id: ${String(_exhaustive)}`);
    }
  }
}
