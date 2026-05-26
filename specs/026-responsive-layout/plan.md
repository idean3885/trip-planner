# Implementation Plan: 데스크탑·모바일 반응형 근본 대응

**Branch**: `026-responsive-layout` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-responsive-layout/spec.md`

## Summary

기존 모바일 폭(~640px) 고정 UI를 디자인 토큰 SSOT 위에서 데스크탑(≥1024px)·와이드(≥1440px) 분기로 확장한다. 토큰을 먼저 정비하고 trip 상세 → trip 목록 → 모달/Form → NavBar 순으로 페이지·컴포넌트를 토큰 키로 일원화한다. 데이터 스키마·API 변경 없음.

## Coverage Targets

- 디자인 토큰 SSOT에 breakpoint·container·grid·gap 토큰 정식화 [why: tokens-foundation] [multi-step: 3]
- trip 상세 페이지 데스크탑 멀티컬럼 레이아웃 [why: trip-detail-layout] [multi-step: 2]
- trip 목록 페이지 데스크탑 카드 그리드 [why: trip-list-grid]
- 캘린더 공유 다이얼로그 데스크탑 폭 정비 [why: gcal-dialog-width]
- 활동 편집·생성 Form 데스크탑 2열 정보 밀도 [why: activity-form-density]
- 글로벌 NavBar 데스크탑 가로 액션 노출 [why: navbar-desktop]
- 모바일(<768px) 회귀 검증 체크리스트 [why: mobile-regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router · Turbopack), React 19, Tailwind CSS v4 (`@theme` CSS-first), shadcn/ui (vendored), `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tailwindcss-animate`, Style Dictionary v4. 본 피처에서 **신규 의존성 도입 없음** — spec 012/013/014 Active Technologies 승계.
**Storage**: N/A (UI 전용. 데이터 스키마 변경 없음.)
**Testing**: Vitest + Testing Library (component), Vercel Preview 수동 검증 (시각 비교). 비주얼 회귀 자동 도구는 도입 안 함(Minimum Cost).
**Target Platform**: 데스크탑/태블릿/모바일 브라우저 (Chromium·Safari·Firefox 최신 안정).
**Project Type**: Web application (Next.js App Router + Python MCP 서버. MCP는 본 피처 무관).
**Performance Goals**: 페이지 LCP·CLS 회귀 없음. CSS-only 분기로 클라이언트 JS 증가 0.
**Constraints**: 모바일(<768px) 시각·동작 회귀 0건. CSS-only 분기(JS resize 리스너 금지). 신규 의존성 0개.
**Scale/Scope**: 작업 대상 페이지 4종(`/trips`, `/trips/[id]`, `/docs`는 이미 적용, settings는 P3 이후), 컴포넌트 5종(GCalLinkPanel, NavBar, Card 그리드 wrapper, ActivityForm·DayCard).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 평가 | 비고 |
|------|------|------|
| I. AX-First | ✅ 위반 없음 | UI 토큰·레이아웃. AI 흐름 직접 영향 없음. |
| II. Minimum Cost | ✅ 위반 없음 | 신규 라이브러리·서비스 0. 기존 Tailwind v4·Style Dictionary 위에서 작업. |
| III. Mobile-First Delivery | ✅ 비위반 (해석 확장) | "모바일 회귀 없음"이 FR-002~FR-008·SC-003에 강제. 모바일 우선 정신을 유지한 채 데스크탑 분기를 추가만 한다. |
| IV. Incremental Release | ✅ 위반 없음 | P1→P2→P3 단계적 릴리즈. 각 묶음이 독립 머지 가능. |
| V. Cross-Domain Integrity | ✅ 위반 없음 | 데이터 변경 없음. 도메인 경계 손대지 않음. |
| VI. RBAC | ✅ 위반 없음 | 권한 매트릭스 변경 없음. UI 표시 조건만 분기. |

**Gate 통과** — Phase 0 진입.

## Phase 0: Research

### 1. 디자인 토큰 SSOT 위치

**Decision**: Tailwind v4 `@theme` 블록(`src/app/globals.css` 또는 별도 CSS 파일)을 일차 SSOT로 두고, Style Dictionary 소스(`tokens/`)에서 동일 키를 export. spec 012/013에서 이미 도입된 구조를 그대로 사용한다.
**Rationale**: 현 코드베이스가 이미 Tailwind v4 CSS-first + Style Dictionary 이중 정의를 운용 중. 새 위치 도입 시 헌법 II(Minimum Cost) 위반.
**Alternatives considered**: CSS variables를 별도 모듈로 분리 — 토큰 SSOT가 둘로 갈라질 위험. 기각.

### 2. breakpoint 키 이름

**Decision**: `--bp-mobile` (`480px` 기준 하단), `--bp-tablet` (`768px`), `--bp-desktop` (`1024px`), `--bp-wide` (`1440px`). Tailwind screens 키도 `mobile / tablet / desktop / wide`로 정의. 기본 Tailwind sm/md/lg/xl 별칭은 유지(외부 라이브러리 호환).
**Rationale**: spec.md Clarification 1의 분류와 1:1 매핑. 사용자 표면 어휘로 코드에서 의도가 즉시 드러남.
**Alternatives considered**: Tailwind 기본 `sm/md/lg/xl` 그대로 — 의도가 코드에 안 드러남. 기각.

### 3. container max-width 토큰

**Decision**: `--container-content: 1280px`(일반 페이지), `--container-wide: 1440px`(/docs·trip 상세 풀폭), `--container-narrow: 768px`(설정·폼 등 좁은 페이지). 페이지 wrapper가 본 토큰을 직접 참조.
**Rationale**: /docs(#477)에서 이미 사용 중인 풀폭 패턴과 호환. 새 페이지 추가 시 3종 중 1개만 선택하면 끝.
**Alternatives considered**: 단일 max-width(1280px) — /docs의 1440px 풀폭과 불일치. 기각.

### 4. trip 상세 멀티컬럼 분할 비율

**Decision**: 데스크탑(≥1024px)에서 grid `grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]` 사용. 본문 2/3, 사이드 1/3, 사이드 최소 폭 280px 보장. <1024px는 단일 컬럼 그대로.
**Rationale**: 멤버·캘린더·메타 정보가 280px 미만에서는 줄바꿈 깨짐. 본문 2/3은 Day·Activity 카드가 다단으로 펼쳐질 여유 확보.
**Alternatives considered**: 1/2·1/2 분할 — 사이드 정보가 너무 넓어 본문 정보 밀도 손해. 기각.

### 5. CSS-only 분기 강제

**Decision**: 본 피처 전 범위에서 JS `window.matchMedia` 또는 resize 리스너 사용 금지. Tailwind responsive prefix(`md:`, `lg:`)·CSS container query·media query만 사용.
**Rationale**: 클라이언트 JS 증가 0 + SSR/RSC 일관성. 사용자가 창 폭을 좁히면 즉시 전환.
**Alternatives considered**: `useMediaQuery` 훅 — hydration mismatch 위험 + 불필요 JS. 기각.

### 6. 비주얼 회귀 검증 도구

**Decision**: 자동 비주얼 회귀 도구 도입하지 않음. 대신 quickstart.md에 데스크탑/모바일 스크린샷 비교 체크리스트와 폭별 수동 시나리오를 정리. Vercel Preview에서 작업자가 수동 확인.
**Rationale**: 헌법 II(Minimum Cost). Percy·Chromatic 등은 유료 또는 별도 설정 필요. 1인 개발에서 ROI 낮음.
**Alternatives considered**: Playwright + visual snapshot — 가능하지만 도입·유지 비용. 후속 별도 이슈로 검토.

### 7. 작업 단위 분할 (이슈 묶음)

**Decision**: 5개 묶음으로 분할 → 자식 이슈 5개:
- **A) 토큰 정비** — Coverage `tokens-foundation`. breakpoint/container/grid 토큰 + /docs 페이지 일원화 회귀 확인.
- **B) trip 상세 멀티컬럼** — Coverage `trip-detail-layout`. Day/Activity 본문 + 사이드 패널 분리.
- **C) trip 목록 + 모달** — Coverage `trip-list-grid`, `gcal-dialog-width`. 카드 그리드 + 다이얼로그 폭.
- **D) Form + NavBar** — Coverage `activity-form-density`, `navbar-desktop`. 입력 폼 2열 + NavBar 가로 액션.
- **E) 모바일 회귀 점검** — Coverage `mobile-regression`. 최종 검증 라운드 + quickstart 체크리스트 마감.
**Rationale**: 사용자 요청(태스크당 이슈 1개는 과도)에 맞춰 토픽 단위로 묶음. A→B→C→D→E 의존 순서 명확. 각 묶음이 독립 머지 가능.
**Alternatives considered**: 페이지별 7~8 이슈로 더 잘게 — 관리 부담. 기각.

**Output**: research.md (별도 파일에도 동일 내용 저장)

## Phase 1: Design & Contracts

### 1. data-model.md

**N/A** — 본 피처는 데이터 모델 변경이 없다(FR-009). 별도 파일 생성하지 않는다.

### 2. contracts/

**N/A** — 외부 API·MCP 인터페이스 변경이 없다. 별도 파일 생성하지 않는다.

### 3. quickstart.md

각 묶음(A~E) 검증 시나리오 + Evidence 규약 적용. 자동/수동 증거를 포함한다.

### 4. Agent context update

`.specify/scripts/bash/update-agent-context.sh claude` 실행 → CLAUDE.md Active Technologies 섹션에 본 피처 항목 추가.

**Output**: quickstart.md, agent-specific file

## Project Structure

### Documentation (this feature)

```text
specs/026-responsive-layout/
├── plan.md              # 본 파일
├── research.md          # Phase 0 출력 (사실상 본 plan.md의 Phase 0 절을 별도 복사)
├── quickstart.md        # Phase 1 출력 — 검증 시나리오·Evidence
├── checklists/
│   └── requirements.md  # spec 품질 자체 검증 (이미 작성)
└── tasks.md             # /speckit.tasks 출력 (다음 단계)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css            # Tailwind @theme 블록 — breakpoint·container·grid 토큰
│   ├── trips/
│   │   ├── page.tsx           # 목록 — 카드 그리드 데스크탑 2~3열
│   │   └── [id]/page.tsx      # 상세 — 본문+사이드 멀티컬럼
│   └── (other pages)
├── components/
│   ├── GCalLinkPanel.tsx      # 다이얼로그 폭 정비
│   ├── NavBar.tsx (또는 헤더) # 데스크탑 가로 액션
│   ├── ActivityForm.tsx       # 2열 입력 정보 밀도
│   ├── DayCard.tsx (해당 시)
│   └── ui/                    # shadcn vendored
└── lib/
    └── (변경 없음)

tokens/
└── (Style Dictionary 소스 — globals.css와 키 일치)

tests/
├── components/
│   └── (해당 컴포넌트 단위 테스트 — 분기 클래스 존재 검증 정도)
└── (e2e 도입 안 함 — 수동 시나리오로 대체)
```

**Structure Decision**: 신규 디렉토리 없음. 기존 `src/app/`·`src/components/`·`tokens/` 위에서 수정만 한다. 헌법 II(Minimum Cost)와 부합.

## Complexity Tracking

위반 사항 없음 — 본 섹션은 비워둔다.
