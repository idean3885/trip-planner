# Research: 대문 접근성·진입 플로우 정비

## R1. 로그인 사용자 대문 접근 차단의 원인

- **Decision**: `src/app/page.tsx`의 로그인 시 `redirect("/trips")`를 제거하고, `auth()` 결과의 로그인 여부를 `LandingPage`에 prop으로 전달한다.
- **Rationale**: 현재 `page.tsx`는 세션이 있으면 즉시 `/trips`로 서버 리다이렉트한다. 이 한 줄이 (a) 대문 접근 불가, (b) 로고("우리의 여행", `layout.tsx` `href="/"`) 클릭 시 목록 복귀 두 증상의 공통 원인이다. 리다이렉트를 제거하면 두 증상이 함께 해소되고, 로고는 이미 `/`를 가리키므로 자동으로 대문에 도달한다.
- **Alternatives considered**: 미들웨어에서 분기 — 기각. 미들웨어는 이미 공개 경로(`/`)를 통과시키며, 주석에도 "로그인 `/`→`/trips`는 page.tsx가 처리"라고 명시. 로직을 page.tsx에 두는 편이 응집도가 높다.

## R2. 세션 여부를 CTA에 반영하는 방법

- **Decision**: `Hero`·`BottomCta`를 서버 컴포넌트로 유지하고, `LandingPage`가 받은 `isLoggedIn`을 prop으로 내려보낸다.
- **Rationale**: `page.tsx`가 이미 서버에서 `auth()`를 호출하므로 세션 정보가 서버에 있다. prop 전파는 클라이언트 세션 훅(`useSession`)·추가 요청 없이 서버 렌더 한 번으로 끝난다(Minimum Cost). 기존 컴포넌트들은 모두 서버 컴포넌트라 패턴이 일치한다.
- **Alternatives considered**: 클라이언트에서 `useSession` — 기각. 불필요한 클라이언트 번들·깜빡임(로그아웃 CTA가 먼저 그려짐) 유발.

## R3. 로그인 후 목적지 고정

- **Decision**: `src/app/auth/signin/page.tsx`의 `redirectTo` 기본값을 `"/"` → `"/trips"`로 변경한다. `callbackUrl`이 있으면 그대로 우선.
- **Rationale**: 리다이렉트 제거(R1) 후에는 기본값 `"/"`가 대문에 머물게 만든다. 로그인 직후 사용자의 목표는 자기 여행을 다루는 것이므로 목적지를 여행 목록으로 명시한다. `callbackUrl`(보호 페이지 접근 → signin 유도) 경로는 기존대로 원래 페이지로 복귀한다.
- **Alternatives considered**: Auth.js `redirect` 콜백 전역 지정 — 기각. 범위가 넓고 다른 인증 진입(CLI OAuth 등)에 영향. signin 페이지 기본값 한정이 안전.

## R4. 두 소개 섹션 통합 방향 (UX 리뷰 반영)

- **Decision**: `FeatureHighlights`(구체 불릿)를 뼈대로, `ValueProps`(혜택 헤드라인)의 톤을 합쳐 단일 섹션 4카드로 병합한다. `landing-content.ts` 데이터를 정리하고 중복 컴포넌트 하나를 `LandingPage`에서 제거한다.
- **Rationale**: UX 리뷰 결과 `ValueProps`(4카드)는 `FeatureHighlights`(3카드)의 혜택 재진술로 대부분 중복이다. 통합 시 고유 항목(3계층 관리·현지 시간·Apple 캘린더·한 줄 설치·통화 합산)을 보존하면 정보 손실이 없다. 카드당 "혜택 제목 + 구체 불릿"이 스캔성과 신뢰를 함께 준다.
- **Alternatives considered**: 두 섹션 유지하되 한쪽 축소 — 기각. 중복 자체가 요청 대상. 헤딩만 바꾸는 것은 근본 미해결.

## R5. 접근성 — 헤딩 시맨틱 통일

- **Decision**: 통합 섹션의 카드 제목을 `h3`로 통일한다.
- **Rationale**: 현재 `ValueProps`는 `h3`, `FeatureHighlights`는 `CardTitle`(`div`)이라 헤딩 아웃라인에서 후자가 누락된다. 통합하며 `h3`로 맞추면 스크린리더 탐색과 SC-005(가치 항목 확인) 검증이 쉬워진다.
- **Alternatives considered**: 전역 `CardTitle`을 `h3`로 변경 — 기각. 다른 화면의 카드에 파급. 대문 통합 섹션에 한정한다.
