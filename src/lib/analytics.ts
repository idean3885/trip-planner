/**
 * spec 057 — 사용자 분석(GA4) 전송 헬퍼.
 *
 * 측정 ID(NEXT_PUBLIC_GA_ID)가 없으면 모든 함수가 no-op이라 앱은 정상 동작한다.
 * 개인정보(이메일·이름 등 PII)는 전송하지 않는다. user_id에는 내부 식별자만 넣는다.
 */

import { sendGAEvent } from "@next/third-parties/google";

/** 측정 ID. 미설정이면 분석 비활성. 함수로 두어 런타임/테스트 env를 반영한다. */
function measurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_ID || undefined;
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(measurementId());
}

/** 핵심 전환 이벤트 전송. 측정 ID 없으면 no-op. params에 PII 금지. */
export function track(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!measurementId()) return;
  sendGAEvent("event", name, params ?? {});
}

/** 로그인 사용자를 익명 내부 식별자로 연결. 측정 ID 없으면 no-op. PII 금지. */
export function setAnalyticsUser(userId: string | null): void {
  if (!measurementId()) return;
  sendGAEvent("set", { user_id: userId ?? undefined });
}
