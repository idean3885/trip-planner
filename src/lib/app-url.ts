/**
 * 앱 URL 도출 헬퍼.
 *
 * 목적: 환경별 외부 설정(AUTH_URL 등) 의존을 제거하고, 각 환경이 자기 origin만 바라보게 만든다.
 * "dev가 prod 참조, local이 dev 참조" 같은 교차 참조를 구조적으로 차단.
 *
 * 3-layer 구분:
 * - Layer 1 (앱 내부 링크): 요청 origin 기반. env 의존 0. 사용처: 초대 링크, 공유 링크 등
 * - Layer 2 (OAuth 콜백): Auth.js의 trustHost + Vercel 자동 env로 자체 해결. 본 파일 미사용
 * - Layer 3 (canonical 외부 노출): 프로덕션 도메인. Vercel built-in `VERCEL_PROJECT_PRODUCTION_URL`로 흡수
 */

/**
 * Layer 1 — 현재 요청이 도달한 origin을 그대로 돌려준다.
 * 초대 링크, 공유 링크, 리다이렉트 등 **내부 링크** 생성에 사용.
 *
 * Vercel이 Host 헤더를 검증해 주므로 신뢰 가능. 자체 호스팅 환경에서도 프록시가
 * Host를 정상 전달한다는 전제 위에서 안전.
 */
export function getAppOrigin(request: Request): string {
  return new URL(request.url).origin;
}

/**
 * Layer 3 — 프로덕션 canonical URL.
 * 사용처: 이메일 본문, SEO/OG 메타, 외부 알림 등 **수신자 환경과 무관하게 안정적이어야 하는** 링크.
 *
 * 우선순위:
 *  1. `APP_PRODUCTION_URL` — 프로젝트가 명시한 canonical (도메인 소유권 주장)
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel 자동 제공 (프로젝트의 프로덕션 도메인)
 *  3. 폴백 없음 — 위 둘 다 없으면 `null` 반환. 호출자가 의미 있는 폴백을 결정해야 함
 *     (예: 내부 링크 문맥에서는 `getAppOrigin(request)`로 폴백)
 */
export function getCanonicalOrigin(): string | null {
  const explicit = process.env.APP_PRODUCTION_URL;
  if (explicit) return normalizeOrigin(explicit);

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return normalizeOrigin(vercelProd);

  return null;
}

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}
