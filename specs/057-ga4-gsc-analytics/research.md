# Research: 사용자 분석(GA4)·검색 노출(GSC) + 카피 간소화

**Feature**: 057-ga4-gsc-analytics | **Date**: 2026-06-05

무료 티어·시장 표준은 웹서치로 확인(2026-06): GA4 표준 무료(360만 유료), GSC 무료. PostHog(100만 이벤트 무료)·Amplitude(10K MTU)도 무료지만 대세 적합성 기준으로 GA4 채택.

## Decision 1: 분석 도구 = GA4, 통합은 `@next/third-parties`

- **Decision**: GA4를 채택하고 Next 공식 `@next/third-parties/google`의 `GoogleAnalytics` 컴포넌트로 통합한다. 측정 ID는 `NEXT_PUBLIC_GA_ID` 환경변수, 미설정 시 컴포넌트를 렌더하지 않는다.
- **Rationale**: GA4는 시장 표준(협업·채용 통용)이라 차별화가 아닌 대세 적합성에 맞다. 자체 gtag 스니펫 대신 공식 패키지를 쓰는 건 라이브러리 우선 원칙(ADR-0002). `afterInteractive` 로드라 초기 렌더 영향이 작다.
- **Alternatives considered**: PostHog(행동·세션리플레이 강하나 한국 대세 아님, 차별화 부담), Amplitude(제품분석 표준이나 무료 한도 빡빡), Vercel Web Analytics(익명 집계만, 사용자 식별 불가). 모두 보류 — 근거는 ADR.

## Decision 2: 핵심 전환 이벤트 + 익명 User-ID

- **Decision**: 페이지뷰는 `GoogleAnalytics`가 자동 수집. 핵심 전환은 클라이언트에서 이벤트 헬퍼(`src/lib/analytics.ts`의 `track()`)로 전송: `trip_created`(여행 생성 성공), `calendar_import`(가져오기 실행 성공). 로그인 사용자는 GA `user_id`에 내부 사용자 식별자(개인정보 아님)를 연결하는 클라이언트 컴포넌트(`components/analytics`)로 set.
- **Rationale**: 가입(신규 사용자)의 정확한 서버 측 추적은 Measurement Protocol이 필요해 비용이 크다 → 1차는 클라이언트 best-effort(`sign_in`)로 두고 정밀 가입 추적은 후속. 전환 이벤트는 발생 지점이 명확한 여행 생성·가져오기부터.
- **이벤트 호출 지점**: 여행 생성 성공(trip 생성 폼/액션 성공 후 클라이언트), 가져오기 성공(`ImportSection.handleImport` 성공 분기). 로그인 이벤트는 로그인 성공 진입 후.
- **Alternatives considered**: 서버 Measurement Protocol(정확하나 복잡·키 관리) → 후속. GTM(태그 관리 유연하나 초기 과함) → 보류.
- **개인정보**: `user_id`는 내부 식별자만(이메일·이름 전송 금지). IP 익명화는 GA4 기본. 동의 배너는 범위 밖, 개인정보 처리 고지에 쿠키 사용 반영.

## Decision 3: 측정 ID 미설정 시 안전 비활성

- **Decision**: `NEXT_PUBLIC_GA_ID`가 없으면 `GoogleAnalytics` 미렌더 + `track()`은 no-op(가드). 앱 기능은 영향 없음.
- **Rationale**: 측정 ID 발급·Vercel env 등록은 사람이 콘솔에서 하는 단계. 코드는 값 유무와 무관하게 안전해야 한다(FR-006). 테스트도 미설정 환경에서 회귀 0 검증.

## Decision 4: 검색 노출 최소 — robots.ts + sitemap.ts + 메타

- **Decision**:
  - `src/app/robots.ts` — 공개 경로 allow, 앱 경로(`/trips`, `/settings`, `/day` 등) disallow, sitemap 참조.
  - `src/app/sitemap.ts` — 공개 페이지 정적 목록(`/`, `/about`, `/docs`). 로그인 뒤 경로 제외.
  - 소유 확인: 루트 `metadata.verification`에 환경변수(`NEXT_PUBLIC_` 불필요, 서버 메타) 주입. 미설정 시 미적용.
  - 앱 본체 noindex: 인증 영역 레이아웃 `metadata.robots = { index: false }` + robots.ts disallow 이중.
- **Rationale**: 동적 앱이라 색인 가치가 낮아 공개 페이지만 노출(Clarification 2). robots disallow(크롤 차단)와 meta noindex(색인 차단)를 함께 둬 누락 방지.
- **Alternatives considered**: 동적 sitemap(공개 trip 없음 → 불필요), GSC sitemap 자동 ping(후속).

## Decision 5: 카피 — 활성 노출만 수정

- **Decision**: 사용자에게 실제 노출되는 `CalendarSyncDialog`(제목·설명·안내 박스)와 `ImportSection`(빈 상태 안내)의 코드명·기술 설명을 제거. `ImportOnlyNotice` 박스 제거. 필요한 자리엔 앱 이름 "우리의 여행" 또는 생략.
- **Rationale**: 레거시·미노출 컴포넌트(`AppleConnectWizard`·`CalendarImportPanel`)와 내부 상수(`gcal.ts` suffix)는 사용자 화면에 안 나오므로 범위 밖(spec Edge Case). 활성 노출만 정리해 변경 폭 최소화.
- **확인 결과(T019)**:
  - `CalendarImportPanel` — 실제 import 문 0건(주석 언급만). **dead 코드**라 수정 불필요.
  - `AppleConnectWizard` — `/settings/calendars`·`/trips/<id>/calendar/connect-apple`에서 **활성**. 단 그 코드명 노출("trip-planner" 캘린더 이름·라벨)은 **외부 캘린더 연결(생성) 맥락**이고, spec 056에서 410 폐지한 `apple/connect` API를 호출하는 상태다. 즉 export 폐지의 UI 잔재 정리가 별도로 필요하다. 본 피처(가져오기 화면 카피)는 `CalendarSyncDialog`·`ImportSection`으로 한정하고, AppleConnectWizard/connect-apple/gcal suffix 정리는 **spec 056 후속(별도 이슈)**로 분기한다.

## Decision 6: 도구 선택 ADR

- **Decision**: `docs/adr/`에 "사용자 분석·검색 노출 도구 선택"을 기록 — GA4 채택 근거, PostHog/Amplitude/Vercel 보류 근거, "정적 SEO가 아니라 동적 앱은 행동 분석이 본질 → GSC는 최소" 판단, 대세 우선 원칙.
- **Rationale**: "왜 X 아니고 Y" 결정이고 블로그 서사의 근거. 헌법·feedback(대세 우선)과 연결.

## Open Questions

없음 — spec Clarifications 1~5 + 본 research로 봉합.
