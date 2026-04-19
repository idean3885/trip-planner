# Phase 1: Data Model — Landing Content Schema

**Branch**: `014-landing-docs-refresh` | **Date**: 2026-04-20

> 본 피처는 영속 데이터 스키마 변경이 없다. 여기서 정의하는 "모델"은 **랜딩 페이지의 콘텐츠 정보 구조**와 **docs 재구성의 메타 정보 구조**다. 코드 구현 시 TypeScript 타입·정적 배열·정적 객체로 구체화된다.

---

## 1. Landing 콘텐츠 모델

랜딩은 단일 페이지에 섹션들이 수직으로 쌓인다. 섹션별 콘텐츠 스키마를 정의한다.

### 1.1 `Hero`

프로젝트 정체성을 한 문장으로 단언하고 주요 CTA를 제공한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `eyebrow` | `string?` | 최상단 라벨(예: "오픈 소스 · MIT") — 선택 |
| `title` | `string` | 정체성 한 문장(예: "대화로 만드는 여행 플래너") |
| `subtitle` | `string` | 보조 설명 1~2문장 |
| `primaryCta` | `CtaLink` | "시작하기" — 로그인 플로우로 연결 |
| `secondaryCta` | `CtaLink` | "GitHub에서 보기" — 저장소 링크 |

### 1.2 `ValueProp`

핵심 가치 카드 한 개의 모델. 랜딩에는 3~5개 배열로 존재.

| 필드 | 타입 | 설명 |
|------|------|------|
| `icon` | `LucideIconName` | 아이콘 식별자 |
| `title` | `string` | 가치 한 줄 표제 |
| `description` | `string` | 1~2문장 설명 |

**Validation**: 배열 길이 3 이상 5 이하(가이드라인). 각 `title`은 공백 포함 28자 이내(모바일 가독).

### 1.3 `FeatureHighlight`

주요 기능의 "무엇을 할 수 있는가"를 2~3개 소개한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | `string` | 기능 이름(예: "AI 에이전트로 일정 편성") |
| `summary` | `string` | 1~2문장 요약 |
| `bullets` | `string[]?` | 세부 항목 0~4개 |
| `media` | `ScreenshotRef?` | 관련 스크린샷 레퍼런스(없어도 됨) |

### 1.4 `TechStackItem`

기술 스택 배지 한 개.

| 필드 | 타입 | 설명 |
|------|------|------|
| `label` | `string` | 표시명(예: "Next.js 16") |
| `category` | `"framework" \| "data" \| "deploy" \| "ai" \| "infra"` | 분류 |
| `url` | `string?` | 해당 기술 공식 사이트(선택) |
| `iconSrc` | `string?` | SVG 아이콘 경로(선택, 없으면 텍스트 배지) |

**Validation**: `category`는 enum. 전체 배열은 12개 이하(과도한 배지 나열 지양).

### 1.5 `ScreenshotRef`

데모 스크린샷 1컷의 메타.

| 필드 | 타입 | 설명 |
|------|------|------|
| `src` | `string` | `/landing/{name}.png` 등 public 경로 |
| `alt` | `string` | "무엇을 보여주는가"를 담은 대체 텍스트(접근성 필수) |
| `caption` | `string?` | 하단 캡션(선택) |
| `viewport` | `"desktop" \| "mobile"` | 촬영 시 뷰포트 |
| `width` | `number` | 실제 이미지 폭(px) |
| `height` | `number` | 실제 이미지 높이(px) |

### 1.6 `CtaLink`

버튼/링크의 최소 모델.

| 필드 | 타입 | 설명 |
|------|------|------|
| `label` | `string` | 표시 문구 |
| `href` | `string` | 이동 경로(내부/외부) |
| `variant` | `"primary" \| "secondary" \| "ghost"` | shadcn Button variant 매핑 |
| `external` | `boolean?` | 외부 링크 여부(신탭·아이콘 처리) |

### 1.7 `LandingContent` (루트)

한 페이지 전체의 컴포지션.

| 필드 | 타입 | 설명 |
|------|------|------|
| `hero` | `Hero` | 1.1 |
| `values` | `ValueProp[]` | 1.2 (3~5) |
| `features` | `FeatureHighlight[]` | 1.3 (2~3) |
| `techStack` | `TechStackItem[]` | 1.4 (≤ 12) |
| `demo` | `ScreenshotRef[]` | 1.5 (1~4) |
| `bottomCta` | `{ primary: CtaLink; secondary?: CtaLink; tertiary?: CtaLink }` | 하단 CTA 3축 |
| `footer` | `{ copy: string; links: CtaLink[] }` | 푸터 |

**Single Source of Truth**: `Hero.title`·`Hero.subtitle`은 `src/lib/project-meta.ts`의 `tagline`·`description`을 재사용한다. README와 `/about`도 동일 소스 사용.

---

## 2. docs 재구성 메타 모델

### 2.1 `DocsGroup` (독자 그룹 엔트리)

`docs/README.md`가 표현할 엔트리 목차의 모델.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `"external" \| "contributor" \| "operations" \| "shared"` | 그룹 식별자 |
| `title` | `string` | 표시명(예: "기여자·개발자용") |
| `description` | `string` | 1줄 안내 |
| `entries` | `DocEntry[]` | 속한 문서들 |

### 2.2 `DocEntry`

그룹 내 문서 한 건.

| 필드 | 타입 | 설명 |
|------|------|------|
| `path` | `string` | 상대 경로(예: `./ARCHITECTURE.md`) |
| `title` | `string` | 표시명 |
| `summary` | `string` | 1줄 요약(누가·왜) |

### 2.3 `DocReaderHeader`

모든 `docs/**/*.md` 문서 상단에 붙일 1줄 메타(마크다운 문법으로 표현).

**형식 규약**:
```markdown
> **대상 독자**: {그룹 라벨} — {보조 설명 1줄}
```

**매핑 (R7 확정안)**:

| 파일 | 그룹 | 라벨 문구 |
|------|------|-----------|
| `ARCHITECTURE.md` | 기여자·개발자 | 기여자·개발자 |
| `DEVELOPMENT.md` | 기여자·개발자 | 기여자·개발자 |
| `DOMAIN.md` | 기여자·개발자 | 기여자·개발자 |
| `ERD.md` | 기여자·개발자 | 기여자·개발자 |
| `design-handoff.md` | 기여자·개발자 | 디자이너·개발자 협업 |
| `ENVIRONMENTS.md` | 운영·감사 | 운영·감사 |
| `WORKFLOW.md` | 공통(기여자+운영) | 기여자·개발자·운영자 공통 |
| `audits/**` | 운영·감사 | 운영·감사(감사 기록) |
| `evidence/**` | 운영·감사 | 운영·감사(수동 증적) |
| `research/**` | 운영·감사 | 리서치(조사 스냅샷) |

### 2.4 `LegacyRootFile` (선택 트랙 메타)

루트 정리 대상의 검증·처리 상태 기록.

| 필드 | 타입 | 설명 |
|------|------|------|
| `path` | `string` | 파일 경로 |
| `category` | `"personal-legacy" \| "jekyll-residue" \| "mcp-artifact"` | 분류 |
| `referenceGrep` | `string[]` | 검증에 사용한 grep 패턴 |
| `references` | `string[]` | 검색 결과(0건이어야 제거 가능) |
| `decision` | `"remove" \| "relocate" \| "keep"` | 처리 결정 |
| `commit` | `string?` | 실제 제거 커밋 SHA(실행 후 채움) |

이 모델은 `docs/audits/2026-04-root-legacy-audit.md` 같은 감사 기록에 채워 영구 보존 대상.

---

## 3. State Transitions

본 피처엔 의미 있는 상태 전이가 거의 없다. 단 `/` 라우트의 응답 상태는 명확히 기술한다.

```
visitor arrives at "/"
  ├── session?.user?.id === undefined
  │     └── render Landing (200 OK, 공개 SSR)
  └── session?.user?.id defined
        └── redirect("/trips") (307)
```

---

## 4. Validation Summary

| 규칙 | 위치 | 검증 방식 |
|------|------|-----------|
| `ValueProp.title` ≤ 28자 | 1.2 | 빌드 타임 정적 검사(테스트) |
| `TechStackItem` 배열 ≤ 12 | 1.4 | 빌드 타임 정적 검사(테스트) |
| 모든 `ScreenshotRef.alt` 비어있지 않음 | 1.5 | 단위 테스트 |
| `/` 비로그인 200, 로그인 307→`/trips` | §3 | e2e 테스트 |
| 모든 `docs/**/*.md` 상단 `> **대상 독자**:` 존재 | 2.3 | 스크립트 검증(`scripts/check-docs-reader-header.sh`) |
