# Implementation Plan: API/CLI 인증 — 범용 OAuth 로그인 커맨드 + 단기 만료 토큰

**Branch**: `059-cli-oauth-login` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/059-cli-oauth-login/spec.md`

## Summary

브라우저 OAuth로 토큰을 자동 발급하는 흐름(spec 007)은 `install.sh`·MCP에만 묶여 있다. 이를 **임의 API 소비자도 쓰는 독립 실행 커맨드**로 추출하고(기존 `scripts/bootstrap/oauth-listener.mjs` + `/api/auth/cli` 재사용), **자동 발급 토큰에 단기 만료(기본 30일)**를 부여한다. 만료 시 자동 갱신 소비자(MCP)는 기존 401 재인증 패턴으로 잇고, 일반 소비자는 재로그인 안내를 받는다. 수기 발급·웹 세션·기존 install/MCP 경로는 회귀 없이 유지한다.

기술 접근: 신규 의존성 없음. **스키마 변경 없음** — `PersonalAccessToken.expiresAt`이 이미 있어 자동 발급 경로가 단기 만료를 채우면 된다. 인증 방식(토큰 모델)은 그대로(JWT 전환 안 함).

## Coverage Targets

- 범용 OAuth 로그인 커맨드 — 독립 실행 진입점(oauth-listener + /api/auth/cli 재사용), 토큰 키체인 저장 [why: cli-login] [multi-step: 2]
- 자동 발급 토큰 단기 만료(기본 30일) — auth/cli·bootstrap 발급 경로에 만료 부여 [why: token-expiry]
- 만료 시 재인증 — 자동 갱신 소비자(MCP 401 패턴) + 일반 소비자 재로그인 안내 [why: reauth] [multi-step: 2]
- 기존 경로 회귀 가드 — install·MCP·웹 세션·수기 발급 보존 [why: no-regression]

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16 App Router, Auth.js v5), Node.js 20+ (`oauth-listener.mjs`), Python 3.10+ (MCP `web_client.py`), Bash (`install.sh`).  
**Primary Dependencies**: Auth.js v5(Google OAuth2), 기존 `/api/auth/cli`·`/bootstrap`·`scripts/bootstrap/oauth-listener.mjs`·`src/lib/token-helpers.ts(createPAT)`·macOS 키체인. **본 피처 신규 의존성 없음.**  
**Storage**: Neon Postgres. **스키마 변경 없음** — 기존 `PersonalAccessToken.expiresAt` 재사용(자동 발급 경로가 단기 만료를 채움). 마이그레이션 0건.  
**Testing**: vitest — 발급 경로 만료 부여, 만료 토큰 인증 거부(`auth-helpers`), 재인증 안내. 기존 라우트/토큰 테스트 패턴.  
**Target Platform**: 웹(API·OAuth 콜백) + 로컬 CLI(스크립트) + MCP.  
**Constraints**: 토큰은 OS 보안 저장소에만(레포·로그·평문 금지). 콜백 출처·state(1회용) 검증. 동시 인증 single-flight. 부동 시간·도메인 무관.  
**Scale/Scope**: 인증 진입점 1 + 발급 만료 정책 + 재인증 안내. 1인~소수 사용자.

## Constitution Check

*GATE: Phase 0 전 통과, Phase 1 후 재확인.*

- **II. Minimum Cost**: 기존 OAuth 흐름·리스너·createPAT 재사용, 신규 의존성·테이블 0 → 부합.
- **VI. RBAC**: 발급 토큰은 인증된 Google 사용자 본인 것. 콜백 state 검증으로 탈취 방지 → 부합·강화.
- **V. Cross-Domain Integrity**: 인증은 플랫폼 레벨, trip 도메인 경계와 무관 → 부합.
- **IV. Incremental Release**: 스키마 변경 없는 additive 기능, 기존 경로 회귀 가드 → 부합.
- **VII / I / III**: 시간·모바일 UI 무변경. AX 측면에서 토큰 자동 발급이 CLI/AI 연동 편의를 높임.
- **보안 관점**: 단기 만료 도입은 장수명 토큰 상시 보관 위험을 줄임(스펙 동기). state 검증 유지.

**위반 없음.** Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/059-cli-oauth-login/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/ · checklists/requirements.md
└── tasks.md  (/speckit.tasks 산출)
```

### Source Code (repository root)

```text
scripts/
├── bootstrap/oauth-listener.mjs        # 재사용(리스너)
└── auth-login.mjs (또는 .sh)           # 신규 — 독립 실행 진입점(범용 커맨드)

src/
├── lib/token-helpers.ts                # 자동 발급 단기 만료 기본값(상수/헬퍼)
├── app/api/auth/cli/route.ts           # createPAT 호출에 단기 만료 적용
└── app/bootstrap/page.tsx              # createPAT 호출에 단기 만료 적용

mcp/
└── trip_mcp/web_client.py              # 401 자동 재인증(기존) — 만료 토큰 대응 확인/보강

tests/
└── token 만료 부여·만료 인증 거부·발급 경로 회귀 단언
```

**Structure Decision**: 기존 단일 레포 구조 유지. 새 디렉토리 없음. 범용 커맨드는 `scripts/`에 독립 실행 파일로 추가, 발급 만료는 기존 발급 경로 2곳 + token-helpers에 국한.

## Complexity Tracking

> 헌법 위반 없음 — 작성 불필요.
