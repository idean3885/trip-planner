# Contract: 공개 라우트 & 리디렉트 정책

**Branch**: `014-landing-docs-refresh`

본 피처가 관여하는 라우트의 공개/비공개 판정, 인증 상태별 응답, 리디렉트 대상 규약.

## Route Table

| Path | 공개 여부 | 비로그인 접근 시 | 로그인 접근 시 | Notes |
|------|----------|------------------|----------------|-------|
| `/` | **Public (신설)** | 200 OK, 랜딩 페이지 렌더 | **307** → `/trips` | page.tsx 내부 서버 분기. middleware는 공개 허용. |
| `/trips` | Private | 307 → `/auth/signin?callbackUrl=/trips` | 200 OK, 여행 목록 대시보드 | 기존 `/`의 대시보드 로직 이관 대상. |
| `/about` | Public (기존) | 200 OK | 200 OK | 변경 없음. |
| `/docs` | Public (기존) | 200 OK | 200 OK | 변경 없음. |
| `/auth/signin` | Public (기존) | 200 OK | 307 → `/` *(변경: 대시보드가 아니라 `/`)* | 로그인 후 이동처 — 재고 필요. R2 이관 이후엔 `/trips`로 가는 편이 자연. **본 피처 스코프에 포함**. |

## Middleware 판정 규약

`src/middleware.ts`의 `isPublicRoute` 확장.

**Before**:
```ts
const isPublicRoute = pathname === "/about" || pathname.startsWith("/docs");
```

**After**:
```ts
const isPublicRoute = pathname === "/" || pathname === "/about" || pathname.startsWith("/docs");
```

그 외 로직(미로그인→`/auth/signin` 리디렉트, API 라우트 자체 인증 등) 변경 없음.

## Page-level 가드 (`/`)

`src/app/page.tsx`는 본 피처 이후 다음 서버 분기 로직을 갖는다.

```ts
const session = await auth();
if (session?.user?.id) {
  redirect("/trips"); // 307
}
return <LandingPage />;
```

**불변식**:
- 미들웨어에서 `/`를 허용 → page.tsx에서 세션 판정 → 둘 다 통과 시 랜딩 렌더.
- 로그인 상태의 `/` 접근은 **서버 리디렉트**(307)이지 client-side 리디렉트 아님.

## 로그인 후 이동처 (`signIn` callback)

| 시나리오 | callbackUrl 파라미터 | 로그인 성공 후 이동 |
|----------|----------------------|---------------------|
| `/auth/signin` 직접 접근 | 없음 | `/trips` *(본 피처에서 변경 — R2 이관과 짝)* |
| `/trips` 등 사설 경로 접근 → 가드 리디렉트 | `callbackUrl=/trips` | `callbackUrl` 해석 후 이동 |
| `/` 진입 후 로그인 버튼 클릭 | `callbackUrl=/trips` *(랜딩에서 기본 세팅)* | `/trips` |

## SEO 메타 계약 (`/`)

Next.js `metadata` 객체로 설정.

| 필드 | 값 규약 |
|------|---------|
| `title` | `projectMeta.name` — `"소개"` 없이 **단일 이름**만 |
| `description` | `projectMeta.description` 재사용 |
| `openGraph.title` | 동일 |
| `openGraph.description` | 동일 |
| `openGraph.images` | `/landing/hero-og.png` 1장(1200×630 권장) |
| `twitter.card` | `"summary_large_image"` |
| `robots` | 기본값(인덱싱 허용) |

## Test Contract

### e2e (Playwright)

```text
- 비로그인 visitor가 `/` 접근 → 200 OK, Hero `h1` 텍스트 매칭
- 비로그인 visitor가 `/` 접근 → 인증 리디렉트 없음 (URL unchanged)
- 로그인 visitor가 `/` 접근 → `/trips`로 리디렉트
- 랜딩의 "GitHub" 링크가 projectMeta.githubUrl과 일치
- 랜딩의 "시작하기" 링크가 `/auth/signin?callbackUrl=/trips`로 이동
```

### Unit (Vitest)

```text
- middleware: path "/"에 대해 isPublicRoute === true
- middleware: path "/trips"에 대해 isPublicRoute === false
- LandingContent 스키마 검증(ValueProp.title 길이, TechStack ≤ 12)
```
