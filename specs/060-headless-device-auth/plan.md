# Implementation Plan: 헤드리스 인증 경로 (Device Authorization Grant)

**Branch**: `060-headless-device-auth` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/060-headless-device-auth/spec.md`

## Summary

브라우저와 토큰 수신자가 같은 기기가 아닌 환경(모바일→원격, CI, SSH, 헤드리스 에이전트)에서 loopback 콜백 없이 토큰을 획득한다. OAuth 2.0 Device Authorization Grant(RFC 8628)를 따른다: 소비자가 device 요청을 개시 → 사람은 자기 기기에서 안내 링크(verification_uri_complete) 탭 → Google 세션으로 승인 → 소비자가 토큰 엔드포인트를 폴링해 PAT를 자동 수신. 승인 사실은 두 요청(승인·폴링)이 공유하는 가변 상태라 Postgres 단명 테이블(`DeviceAuthorizationRequest`)에 둔다. 발급 토큰은 기존 `createPAT` + 단기 만료(30일)를 재사용하며, **rawToken은 저장하지 않고 승인 후 폴링 시점에 발급해 1회 반환**한다. 기존 loopback·세션·수기 발급 경로는 회귀 없이 유지한다.

## Coverage Targets

- `DeviceAuthorizationRequest` 모델 + Prisma 마이그레이션(schema-only) [why: device-model] [multi-step: 2]
- device 요청 발급 엔드포인트(에이전트 개시 → device_code/user_code/verification_uri 반환) [why: device-init]
- 토큰 폴링 엔드포인트(상태 머신: pending/slow_down/approved→발급/denied/expired) [why: device-poll] [multi-step: 2]
- 승인 화면(사람, Google 세션 게이트 + 승인/거부) [why: device-approve] [multi-step: 2]
- 발급 토큰 정책 승계(승인 후 폴링 시 `createPAT`+`autoPatExpiry`, rawToken 무저장) [why: device-token]
- 소비자 폴링 통합(MCP `web_client`·CLI 진입점) [why: device-client] [multi-step: 2]
- 만료/소비 요청 정리(만료 코드 무발급 + 정리 경로) [why: device-cleanup]
- 기존 인증 경로 회귀 가드(loopback·세션·수기 발급 불변) [why: device-regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router) · Python 3.10+ (MCP 소비자) · Bash (CLI 래퍼)  
**Primary Dependencies**: Next.js 16, Auth.js v5(Google OAuth2·JWT 세션), Prisma 7(@prisma/adapter-pg, Neon), 기존 `src/lib/token-helpers.ts`(`createPAT`/`autoPatExpiry`), httpx(MCP). **신규 의존성 도입 없음**(Redis 미도입 — 헌법 II Minimum Cost).  
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`, #318). 신규 테이블 1종 `DeviceAuthorizationRequest`.  
**Testing**: Vitest(웹 라우트·승인 화면), pytest(MCP web_client) — 기존 스택.  
**Target Platform**: Vercel 서버리스(요청 간 인메모리 비공유 → 공유 가변 상태는 DB). 승인 화면은 모바일 웹.  
**Project Type**: 웹앱(Next.js) + MCP/CLI 소비자.  
**Performance Goals**: 승인 완료 후 다음 폴링(기본 interval 5초 내)에서 토큰 수신. 폴링은 서버 신호(slow_down)로 조절.  
**Constraints**: device 요청 만료 기본 10분, 발급 PAT 만료 30일(기존 자동 발급 승계). rawToken 무저장(at-rest 0). 모바일 승인 1탭.  
**Scale/Scope**: 1인 개발 + 동행자 소수. 동시 device 요청 소량. 신규 엔드포인트 3 + 승인 화면 1 + 테이블 1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. AX-First** ✅ — 본 피처의 본질이 "AI 에이전트가 인증 인터렉션을 자동으로 끌고가는 것". 사람 개입은 승인 1회로 최소화.
- **II. Minimum Cost** ✅ — Redis/KV 등 신규 유료·인프라 도입 없음. 기존 Postgres에 단명 테이블로 처리. (Redis가 교과서적 정본이나 Min Cost 원칙상 기존 스토어 재사용 — 비표준 선택을 data-model에 부연.)
- **III. Mobile-First Delivery** ✅ — 사람 단계는 모바일에서 verification_uri_complete 탭 1회. 승인 화면은 반응형, 탭 가능한 단일 버튼.
- **IV. Incremental Release** ✅ — 기존 loopback·세션·수기 발급 경로 불변(US3 회귀 가드). device flow는 추가 경로.
- **V. Cross-Domain Integrity** ✅ — 인증 도메인 내부. 신규 테이블은 인증 도메인 소유. `User`/`PersonalAccessToken`은 참조·재사용만(단방향).
- **VI. Role-Based Access Control** ✅ — 승인은 **로그인 본인 계정**에 대한 토큰만 발급(권한 상승 없음). 토큰 발급은 trip 행위 매트릭스 대상이 아니며, 발급 토큰의 후속 API 호출은 기존 PAT 권한 검증을 그대로 거친다.
- **VII. Calendar Time Model** — N/A(일정 시간과 무관한 인증 피처).

**위반 없음** — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/060-headless-device-auth/
├── plan.md              # 본 파일
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 (Evidence 포함)
├── contracts/
│   └── device-auth.md   # 엔드포인트 계약
└── tasks.md             # /speckit.tasks (별도)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # + model DeviceAuthorizationRequest, enum DeviceAuthStatus
└── migrations/<ts>_device_auth/migration.sql   # [migration-type: schema-only]

src/
├── app/
│   ├── api/auth/device/
│   │   ├── start/route.ts                # POST 개시 — device_code/user_code/uri 발급
│   │   └── token/route.ts                # POST 폴링 — pending/slow_down/approved→PAT/denied/expired
│   └── auth/device/
│       └── page.tsx                      # 승인 화면(사람) — 세션 게이트 + 승인/거부
└── lib/
    ├── device-auth.ts                    # 코드 생성·해시·상태 전이·정리 헬퍼
    └── token-helpers.ts                  # 재사용(createPAT/autoPatExpiry) — 변경 없음

mcp/trip_mcp/
└── web_client.py                         # device 흐름 폴링 소비자 추가(기존 loopback 유지)

scripts/
└── auth-login.mjs                        # 헤드리스 환경에서 device 흐름 진입(기존 loopback 폴백 유지)

tests/
├── api/device-auth.test.ts               # start/token 상태 머신
├── components/device-approve.test.tsx    # 승인 화면(세션 유무·승인/거부)
└── unit/test_web_client_device.py        # MCP 폴링 소비자
```

**Structure Decision**: 기존 웹앱 구조 유지. 인증 라우트는 `src/app/api/auth/device/*`(에이전트용)와 `src/app/auth/device/page.tsx`(사람 승인)로 분리 — 기존 `/api/auth/cli`·`/bootstrap` 분리 관행 답습. 상태·코드 로직은 `src/lib/device-auth.ts`로 모은다. 소비자(MCP·CLI)는 기존 파일에 device 경로를 **추가**하고 loopback 경로는 보존한다.
