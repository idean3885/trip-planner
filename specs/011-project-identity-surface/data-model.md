# Phase 1: Data Model — 프로젝트 아이덴티티 표면

**Feature**: 011-project-identity-surface
**Date**: 2026-04-19

본 피처는 DB 스키마·마이그레이션을 수반하지 않는다. 정적 상수 하나를 정의할 뿐이다.

## ProjectMeta (정적 상수)

**Location**: `src/lib/project-meta.ts`
**Shape**: `readonly` 객체, 타입으로 강제. 런타임 가변 없음.

### Fields

| 필드 | 타입 | 필수 | 설명 | 예시 값 |
|------|------|------|------|---------|
| `name` | `string` | ✓ | 사용자에게 표시되는 프로젝트 이름 | `"Trip Planner"` |
| `author` | `string` | ✓ | 풋터·About에 표시되는 저작자 식별자 | `"idean3885"` |
| `githubUrl` | `string` (https URL) | ✓ | 공식 저장소 URL. `https://`로 시작 | `"https://github.com/idean3885/trip-planner"` |
| `license` | `string` | ✓ | 라이선스 식별자(SPDX 또는 축약) | `"MIT"` |
| `description` | `string` | ✓ | About 페이지 상단 1문단 설명 | `"AI 기반 여행 계획 및 동행 협업 플래너"` |
| `techStack` | `readonly string[]` | ✓ | About 페이지에 표시할 기술 스택 요약. 순서대로 나열 | `["Next.js 15", "TypeScript", "Prisma", "Neon Postgres", "MCP (Python)"]` |

### Type Definition

```ts
export type ProjectMeta = {
  readonly name: string;
  readonly author: string;
  readonly githubUrl: string;
  readonly license: string;
  readonly description: string;
  readonly techStack: readonly string[];
};

export const projectMeta = {
  name: "Trip Planner",
  author: "idean3885",
  githubUrl: "https://github.com/idean3885/trip-planner",
  license: "MIT",
  description: "AI 기반 여행 계획 및 동행 협업 플래너. MCP 서버와 Next.js 웹앱 통합.",
  techStack: [
    "Next.js 15 (App Router)",
    "TypeScript",
    "Prisma",
    "Neon Postgres",
    "MCP (Python)",
  ],
} as const satisfies ProjectMeta;
```

### Validation Rules

- **모든 필드 필수**: 타입에서 `?` 없이 선언 → `tsc`가 누락을 컴파일 에러로 감지(spec FR-010, SC-006 충족).
- **빈 문자열 방지**: 타입 시스템만으로는 빈 문자열을 막지 못하므로 **린트 규칙 또는 CI 검증** 대신 코드 리뷰 규약으로 커버. 별도 런타임 검증 코드 추가 금지(과잉).
- **`githubUrl` 프로토콜**: 외부 링크 규약상 `https://`로 시작해야 안전. 인라인 주석으로 명시하되 런타임 검증 추가 금지.

### State Transitions

없음. 빌드 시점 고정 상수.

## Relationships

없음. `ProjectMeta`는 단일 모듈 내부에 닫힌 값. 외부 테이블·도메인과 조인 없음.

## 도메인 분류

본 피처의 메타 상수는 **앱 아이덴티티 도메인**(신규)에 속한다. 헌법 V(Cross-Domain Integrity)의 기존 도메인(일정 편성·여행 탐색·동행 협업·예산 관리·일정 활용)과 교차 참조 없음. 따라서 신규 도메인 등록만으로 경계 위배 없음.
