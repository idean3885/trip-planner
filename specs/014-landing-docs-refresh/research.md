# Phase 0 Research: 공개 랜딩 페이지 & 문서 체계 개편

**Branch**: `014-landing-docs-refresh` | **Date**: 2026-04-20

본 문서는 plan.md에서 식별된 조사 항목과 설계 결정의 근거를 기록한다. 각 항목은 Decision / Rationale / Alternatives considered 3단 구조를 따른다.

---

## R1. `/` (랜딩) vs `/about` (기존 소개) 역할 분담

**Context**: 기존에 `/about`이 shadcn 기반의 프로젝트 소개 페이지로 존재한다(v2.5.0 Phase 2 범위에서 형식 정비됨). 이번 피처는 `/`에 "비로그인 방문자용 공개 진입점"을 만든다. 두 경로가 내용상 겹칠 위험이 있다.

**Decision**: 역할을 명확히 분리하여 두 페이지를 공존시킨다.

- **`/` (랜딩)**: 첫인상·설득 중심. Hero(정체성 한 문장)·핵심 가치·주요 기능·기술 스택·데모·CTA·저장소 링크. "10초 안에 뭘 하는 서비스인지 이해"를 목적으로 한다.
- **`/about` (소개)**: 프로젝트 상세 정체성. 철학·기록·스토리·연락처·관련 링크. "더 알아보고 싶은 사람"의 탐색 대상.
- 공통 텍스트(프로젝트 이름·tagline·description·githubUrl 등)는 `src/lib/project-meta.ts` 단일 소스에서 공유하여 두 면이 동일 정체성을 발화하도록 강제한다.

**Rationale**: `/about`은 이미 안정적이고 shadcn 토큰으로 정돈됐다. 이를 랜딩으로 승격하면 (a) 경로 의미가 깨지고, (b) 두 페이지 사이의 책임이 모호해진다. 분리 유지가 최소 변경이자 정보 아키텍처적으로 자연스럽다.

**Alternatives considered**:
- `/about`을 랜딩으로 승격 — **기각**. `/about`은 이미 shadcn 전환 완료된 자산이고 경로 의미가 "소개"로 정립돼 외부 링크 훼손 위험.
- `/`를 완전히 제거하고 `/about`이 루트 리디렉트 수용 — **기각**. 첫 화면의 포트폴리오 가치를 약화.

---

## R2. 기존 대시보드(현재 `/`)의 이관처

**Context**: 현재 `src/app/page.tsx`는 로그인 후 여행 목록을 렌더하는 대시보드 역할을 한다(비로그인은 `/auth/signin`으로 redirect). `/`를 랜딩으로 교체하면 이 기능을 옮겨야 한다.

**Decision**: 대시보드 콘텐츠를 **`/trips`(기존 라우트)의 기본 뷰**로 이관한다.

- 현재 `/trips`는 이미 존재하는 여행 관련 라우트 그룹이다(상세 `src/app/trips/` 확인됨).
- `/` 로그인 사용자 접근 시 서버 측에서 `redirect("/trips")`를 수행한다(middleware가 아닌 page.tsx 내부 분기).

**Rationale**:
- 별도 `/dashboard` 신설보다 `/trips`가 의미상 더 자연스럽다 — "여행 목록"이 실질 대시보드다.
- middleware 분기보다 page.tsx 내부 분기가 SSR 캐시·세션 조회 경로가 단일하다.

**Alternatives considered**:
- `/dashboard` 신설 — **기각**. 새 경로를 만들어 북마크·내부 링크 파괴 리스크를 증가시킴.
- `/`에 로그인·비로그인 둘 다 렌더(헤더 CTA만 분기) — **기각**. SC-005(비로그인 오류·리디렉트 0%)와 충돌 소지, 데이터 로딩 비용 증가.

---

## R3. middleware 공개 경로 허용 방식

**Context**: `src/middleware.ts`는 `isPublicRoute = pathname === "/about" || pathname.startsWith("/docs")`로 공개 경로를 판정한다. `/`는 현재 공개 아님.

**Decision**: `isPublicRoute` 판정에 `pathname === "/"` 조건을 추가한다.

- matcher는 그대로 유지(`["/((?!_next/static|_next/image|favicon.ico).*)"]`).
- 로그인 사용자의 `/` 접근은 page.tsx가 서버에서 `redirect("/trips")`로 처리한다(미들웨어는 공개 허용만 담당).

**Rationale**: 최소 변경. 기존 판정 패턴을 그대로 확장한다.

**Alternatives considered**:
- `auth.config.ts`의 `authorized` 콜백 수정 — **기각**. 현재 middleware가 권위 있는 판정기이며 `authorized` 콜백은 사용되지 않음.
- matcher에서 `/` 자체를 제외 — **기각**. 로그인 사용자의 `/` → `/trips` 리디렉트 로직을 middleware로 끌어오는 것이 가능하지만, 서버 컴포넌트 내부 분기가 테스트·추적이 더 쉬움.

---

## R4. 랜딩 콘텐츠 섹션 구성

**Context**: FR-LA-002 ~ FR-LA-008이 Hero·값·기능·기술·데모·저장소·CTA를 요구한다. 순서·밀도는 열려 있다.

**Decision**: 단일 스크롤 레이아웃, 다음 순서로 섹션 배치한다.

1. **Hero** — 정체성 한 문장 + 핵심 CTA(시작하기) + 보조 CTA(GitHub)
2. **ValueProps** — 3~4개의 짧은 카드: "대화로 만드는 여행", "동행자와 함께", "모바일에서 바로", "AI 에이전트 · MCP"
3. **FeatureHighlights** — 2~3개 주제: 웹에서 일정 관리 / AI(MCP) 자동 편성 / 공유·협업
4. **TechStack** — 배지/로고 격자. 프레임워크·데이터·배포·AI 통합 카테고리
5. **DemoShowcase** — 1~2컷 스크린샷(데스크톱 + 모바일)
6. **CTA (Bottom)** — 로그인/GitHub/문서 링크 3축
7. **LandingFooter** — 저작권·연락·소스 재노출

스크린샷 전 4개 섹션으로 SC-001("10초 이해") 충족을 노린다.

**Rationale**: 포트폴리오·SaaS 마케팅 랜딩의 통상 패턴. AX 제품 특성상 "대화로 만든다"는 차별점을 Hero·ValueProps에서 명확히 노출.

**Alternatives considered**:
- Hero + 단일 CTA만으로 끝나는 초간결 랜딩 — **기각**. 기술 스택·데모 없이는 포트폴리오 어필 부족(SC-002 불충족).
- 섹션 5개 이상으로 확장(사용 사례·로드맵·블로그 등) — **기각**. 유지비 대비 1차 가치 낮음. 필요하면 후속 이슈.

---

## R5. 데모 스크린샷 자산 관리

**Context**: FR-LA-006은 실제 제품 화면 최소 1컷. 스펙 Clarifications #3은 정적 스크린샷 + 캡션을 확정.

**Decision**:

- 저장 경로: `public/landing/` 하위. 파일명 규약: `{surface}-{viewport}.{ext}` (예: `trip-detail-desktop.png`, `trip-detail-mobile.png`).
- 촬영 방법: Playwright headless로 스크립트(`scripts/capture-landing-shots.ts`) 작성하여 재촬영 자동화. 초기 커밋 때는 수동 캡처도 허용.
- 이미지 포맷: PNG(투명 영역 없음) 또는 WebP. 크기는 viewport 실제 해상도(예: 1440×900, 390×844).
- 표시: Next.js `<Image>`로 lazy/priority 구분. 첫 화면 Hero 주변 이미지만 `priority`, 하단은 lazy.

**Rationale**: 정적 자산이라 유지 비용 낮음. 스크립트화로 디자인 시스템 업데이트 시 재촬영 부담 최소. `public/`은 Vercel이 CDN 캐싱.

**Alternatives considered**:
- 라이브 샘플 여행 데이터를 공개 조회로 제공 — **기각**(스펙 Clarification #3으로 범위 밖).
- GIF/MP4 데모 — **기각**. 용량·접근성·유지비 부담.

---

## R6. `docs/spec.md` 등 레거시 문서 처리

**Context**: `docs/spec.md`는 v1 시절의 "Travel Planner — v1 Spec"이다. 현재 정본 스펙은 `specs/` 하위에 있으므로 `docs/spec.md`는 역사적 기록에 가깝다. 독자에게 혼동 유발.

**Decision**:

- `docs/spec.md` → `docs/audits/2026-04-v1-spec-snapshot.md`로 이관한다. 상단에 "역사적 기록 — 현재 정본은 `/specs/`" 안내 한 줄 추가.
- 그 외 명백한 중복/역할 겹침 후보는 다음 2건만 이번 스코프에 포함:
  - `docs/DOMAIN.md` vs `docs/ARCHITECTURE.md`: 전자는 DDD 도메인 맵, 후자는 시스템 아키텍처 — 역할 분리 명확. **유지**.
  - `docs/DEVELOPMENT.md` vs `docs/ENVIRONMENTS.md`: 전자는 개발 절차, 후자는 환경 구성 — 역할 분리 명확. **유지**.
- 즉 이번 스코프의 dedup 실제 실행 건수는 **1건(`docs/spec.md` 이관)** 으로 확정한다.

**Rationale**: 공격적 통합은 링크 파괴·히스토리 손실 리스크. "명백한 레거시 1건"만 제거하고 나머지는 "상단 독자 태깅"으로 역할을 드러내는 것이 최소 변경.

**Alternatives considered**:
- `docs/spec.md`를 물리적으로 삭제 — **기각**. Git 히스토리에 남지만 누군가가 의도적으로 참조할 수 있음. 이관 + 안내가 안전.
- 공격적 통합(예: DOMAIN을 ARCHITECTURE에 흡수) — **기각**. 각자 독립 가치 있음.

---

## R7. docs/ 독자 3층 분류 매핑

**Context**: 스펙 Clarifications #5에서 독자 3층(외부 방문자 / 기여자·개발자 / 운영·감사)을 확정. 실제 파일별 매핑이 필요.

**Decision** (엔트리 `docs/README.md` 목차 구성):

| 독자 그룹 | 포함 문서 | 비고 |
|-----------|-----------|------|
| 외부 방문자 | *(루트 `README.md` + `/` 랜딩 + `/about`이 담당)* | `docs/` 자체는 이 그룹 깊은 문서 없음 — `docs/README.md`가 다른 그룹으로 넘기는 안내 역할 |
| 기여자·개발자 | `ARCHITECTURE.md`, `DEVELOPMENT.md`, `DOMAIN.md`, `ERD.md`, `design-handoff.md` | 코드·도메인·ERD·디자인 핸드오프 |
| 운영·감사 | `ENVIRONMENTS.md`, `audits/`, `evidence/`, `research/`, `audits/2026-04-v1-spec-snapshot.md`(이관분) | 배포 환경·감사 기록·증적·리서치 |
| 공통(기여자 + 운영) | `WORKFLOW.md` | 업무 프로세스 — 양쪽 모두 참조 |

각 문서 상단에는 "**대상 독자**: …" 1줄을 추가한다(FR-DC-002).

**Rationale**: 외부 방문자가 필요로 하는 깊은 문서는 실제로 많지 않다. README·랜딩·`/about`이 1차 커버를 담당하고 docs/는 "한 단계 깊게 들어간 독자"를 상대로 한다. 2~3개 그룹으로 분절하는 것이 UX적으로 자연.

**Alternatives considered**:
- 파일을 디렉터리로 물리 이동(`docs/contrib/`, `docs/ops/`) — **기각**. 기존 외부 링크 깨짐. 상단 태깅 + 엔트리 목차만으로 충분.
- 5층 이상 세분화 — **기각**. 복잡도 대비 이득 적음.

---

## R8. 접근성·JS 비활성·기본 SEO

**Context**: SC-007(접근성 ≥ 90), FR-LA-013(JS 비활성 가독성), 포트폴리오 신뢰도를 충족해야 한다.

**Decision**: 다음을 기본선으로 한다.

- **렌더링 전략**: 랜딩은 Server Component + 정적 콘텐츠. 클라이언트 훅·상태 없음.
- **시맨틱 구조**: `<header>`(Hero) / `<main>` / `<section aria-labelledby="...">` × N / `<footer>`. `<h1>` 1회, 섹션마다 `<h2>`.
- **이미지**: 의미 있는 스크린샷엔 `alt`(무엇을 보여주는지), 장식은 `alt=""`.
- **색·대비**: 직전 디자인 시스템 마이그레이션(v2.5.0)에서 확정된 토큰 조합을 그대로 사용(WCAG AA 기준 확인된 값).
- **포커스 관리**: shadcn/Radix 기본 포커스 링 유지. 커스텀 버튼은 tabindex/keyboard-invoke 확인.
- **메타태그**: Next.js `metadata` 객체 — `title`, `description`, `openGraph.images`(스크린샷 1컷), `twitter.card`. 구조화 데이터는 범위 밖.
- **검증 체크리스트**: `quickstart.md`의 Evidence 섹션에서 Lighthouse 실행 스크립트·결과 기록.

**Rationale**: "정적 콘텐츠 + 시맨틱 태그 + 디자인 토큰 활용"만으로도 접근성 90 달성 가능. 복잡한 ARIA는 오히려 역효과.

**Alternatives considered**:
- axe-core CI 통합 — **미채택**(이번 스코프). 별도 후속 이슈로 분리 가능.
- OG 이미지 서버 API(`/og`) 동적 생성 — **기각**. 정적 PNG로 충분.

---

## R9. 루트 레거시 파일 safe 제거 프로토콜 (선택 트랙)

**Context**: FR-RT-001 ~ FR-RT-003. "제거해도 안전함이 확인된 레거시"만 처리한다.

**Decision**: 파일별 개별 검증 후 제거/이관.

1. **`02_honeymoon_plan.md`** — 개인 여행 일정 기록.
   - 검증: `grep -r "02_honeymoon"` / `grep -r "honeymoon_plan"` → 어떤 경로에서도 참조 없음 확인.
   - 처리: 저장소 밖(`~/Documents/` 등 로컬)로 이관 후 저장소에서 제거. git 히스토리엔 남음.

2. **`_config.yml`, `index.md`** — Jekyll (GitHub Pages) 설정.
   - 검증: GitHub 저장소 Settings > Pages에서 **Pages 비활성 상태** 확인(또는 활성이면 현재 배포 URL이 실제로 사용되는지 확인).
   - 현 상태 추정: Vercel(`trip.idean.me`)로 이전 완료, GitHub Pages는 죽은 배포일 가능성 큼.
   - 처리: 비활성이 확인되면 두 파일 모두 제거. 활성이면 이번 스코프에서 **보류**하고 후속 이슈로 분리.

3. **`claude_desktop_config.example.json`, `manifest.json`** — 현재 설치 스크립트(`scripts/install.sh`)나 문서(`docs/DEVELOPMENT.md` 등)에서 참조되는지 `grep -r` 확인.
   - 참조 중이면 보존. 참조 없으면 제거 후보.

각 제거는 **독립 커밋**으로 분리하여 롤백 가능하게 한다.

**Rationale**: 데이터 유실 방지 + 도구 호환 유지. 선택 트랙이라 "확신 없는 건 보류"가 원칙.

**Alternatives considered**:
- 대규모 루트 리팩토링(디렉토리 재배치 포함) — **기각**. 스펙 Clarifications #4로 이번 스코프에서 제외.

---

## 요약 — 미해결 항목 없음

- 스펙의 NEEDS CLARIFICATION 마커 0건. Technical Context도 모두 확정.
- 본 Phase 0 research가 Phase 1(data-model · contracts · quickstart)의 전제 조건을 모두 채운다.
