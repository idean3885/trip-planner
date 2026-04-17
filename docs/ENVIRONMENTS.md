# 환경과 URL 도출 전략

각 환경(prod / dev / preview / local)이 **자기 origin만 바라보고 동작**하도록, 외부 환경변수 의존을 구조적으로 제거한다. "dev가 prod 참조, local이 dev 참조" 같은 교차 참조를 원천 차단.

## 3-Layer 분리

| Layer | 용도 | 도출 방식 | env 의존 |
|-------|------|-----------|----------|
| Layer 1 — 앱 내부 링크 | 초대 링크, 공유 링크, 리다이렉트 | **요청 origin** (`new URL(request.url).origin`) | 0 |
| Layer 2 — OAuth 콜백 | Google 등 외부 프로바이더의 `redirect_uri` | Auth.js `trustHost: true` + 요청 Host 헤더 | 0 (Vercel 기본) |
| Layer 3 — Canonical 외부 URL | 이메일, SEO/OG 메타, 외부 알림 | `APP_PRODUCTION_URL` 또는 `VERCEL_PROJECT_PRODUCTION_URL` | 0~1 |

핵심: **Layer 1·2는 요청이 도달한 origin이 곧 진실**. 다른 환경을 참조할 구조적 여지가 없다.

## Layer 1 — 앱 내부 링크

- 구현: `src/lib/app-url.ts` → `getAppOrigin(request)`
- 원칙: 내부 링크는 수신자가 **보낸 사람과 같은 환경**에 있을 것으로 간주
  - dev에서 만든 초대 링크는 dev 수신자용 (prod 링크로 보내지 말 것)
  - preview에서 만든 링크는 그 preview 배포용
- 안전성: Vercel이 Host 헤더를 검증 후 전달하므로 스푸핑 여지 없음

## Layer 2 — OAuth 콜백

- 구현: `src/auth.config.ts` → `trustHost: true`
- 의미: Auth.js v5가 요청의 Host 헤더를 신뢰하여 `redirect_uri`를 자체 조립
- 효과: **`AUTH_URL` / `NEXTAUTH_URL` 수동 설정 불필요**
- 전제: Google OAuth 콘솔에 각 환경의 redirect URI를 등록해야 함
  - prod: `https://trip.idean.me/api/auth/callback/google`
  - dev: `https://dev.trip.idean.me/api/auth/callback/google`
  - preview: 고정 URI 불가 → 동일 수준의 지원이 필요하면 "preview용 별칭 도메인"을 1개 두고 그것만 등록 (현재 사용 안 함)

## Layer 3 — Canonical 외부 URL

- 구현: `src/lib/app-url.ts` → `getCanonicalOrigin()`
- 반환: `APP_PRODUCTION_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `null`
- `VERCEL_PROJECT_PRODUCTION_URL`는 **Vercel이 자동 주입**하므로 수동 설정 0
- 호출자가 `null`을 받으면 문맥에 맞는 폴백 결정 (예: 내부 문맥이면 `getAppOrigin(request)`)

## 환경별 요약

| 환경 | Layer 1 | Layer 2 (OAuth) | Layer 3 |
|------|---------|------------------|---------|
| prod (trip.idean.me) | request origin | trustHost | `VERCEL_PROJECT_PRODUCTION_URL` (자동) |
| dev (dev.trip.idean.me) | request origin | trustHost | 프로덕션 URL 자동 주입 — dev가 prod를 참조하는 유일한 지점은 **외부 노출 링크에서만** 프로덕션을 향하고, 나머지는 dev에 고립 |
| preview (*.vercel.app) | request origin | trustHost | 동일 |
| local (localhost:3000) | request origin | trustHost | `null` → 호출자가 결정 |

## 무엇을 하면 안 되는가

- ❌ `AUTH_URL`을 여러 환경에 수동 관리 — `trustHost`로 자체 도출
- ❌ 내부 링크를 canonical 도메인으로 강제 — 환경 교차 참조 유발
- ❌ `process.env.AUTH_URL`을 앱 로직에서 직접 참조 — 이미 `getAppOrigin` / `getCanonicalOrigin` 헬퍼 존재

## 과거 회귀(#194)

- 증상: dev에서 초대 링크가 `/invite/TOKEN` 상대경로로 복사됨 → 붙여넣기 시 `file:///invite/...`
- 원인: `AUTH_URL`이 dev에 미설정이라 빈 문자열로 baseUrl 계산
- 수정: Layer 1 헬퍼 적용. env 의존 제거. 결과적으로 재발 불가능한 구조로 변경
