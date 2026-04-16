# Research: 풀스택 전환

**Date**: 2026-04-09
**Feature**: [spec.md](spec.md)

## R-001: 인증 프레임워크

**Decision**: Auth.js v5 (next-auth@5.x) + @auth/prisma-adapter
**Rationale**: Next.js App Router 네이티브 지원. Edge 미들웨어 호환(JWT 전략). Prisma 어댑터로 사용자 데이터 DB 자동 저장.
**Alternatives considered**:
- Lucia Auth: 경량이나 커뮤니티 작고 어댑터 생태계 부족
- Clerk/Auth0: 관리형 서비스, Minimum Cost 원칙 위반 (유료 또는 무료 제한)
- 직접 구현: 학습 가치 있으나 보안 리스크, 시간 대비 비효율

### 세부 결정

- **세션 전략**: JWT (Edge 미들웨어 호환, DB 조회 없이 인증 확인)
- **설정 패턴**: split-file (auth.config.ts + auth.ts). Edge에서 Prisma import 불가하므로 분리 필수
- **보호 라우트**: middleware.ts에서 auth callback으로 비로그인 차단
- **환경변수**: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

## R-002: 소셜 로그인 프로바이더

**Decision**: Google OAuth2를 초기 프로바이더로 사용
**Rationale**: Auth.js에서 가장 안정적인 프로바이더. 설정 단순. 추후 카카오 등 추가 가능 (프로바이더 배열에 추가만 하면 됨).
**Alternatives considered**:
- 카카오: 한국 사용자에 친화적이나 Auth.js 공식 프로바이더가 아님 (커스텀 필요)
- GitHub: 개발자에게 친화적이나 비개발자 동행자에게 진입 장벽

## R-003: 데이터베이스

**Decision**: Neon Postgres (Vercel Marketplace 통합)
**Rationale**: Vercel 무료 티어 내 통합. PostgreSQL 표준. 서버리스 환경 최적화 (자동 suspend/resume, 내장 PgBouncer 풀러).
**Alternatives considered**:
- Supabase: 무료 티어 있으나 Vercel 직접 통합 없음, 별도 관리 필요
- PlanetScale: MySQL 기반, PostgreSQL 선호
- Vercel KV/Blob: 관계형 데이터에 부적합

### 세부 결정

- **무료 한도**: 0.5GB 저장, 100 CU-hr/월 연산. 10명 규모에 충분
- **커넥션**: DATABASE_URL (풀러 경유, 앱 런타임), DATABASE_URL_UNPOOLED (직접 연결, 마이그레이션 전용)
- **Cold start**: 5분 idle 후 suspend, 첫 요청 시 1~2초 지연

## R-004: ORM

**Decision**: Prisma
**Rationale**: TypeScript 타입 안전. 마이그레이션 도구 내장. Auth.js 공식 어댑터 제공. Next.js 생태계 표준.
**Alternatives considered**:
- Drizzle: 경량, SQL에 가까움. 하지만 Auth.js 어댑터가 Prisma만큼 성숙하지 않음
- Kysely: 쿼리 빌더, ORM이 아님. 학습 목적에서 Prisma가 Spring JPA와 대응 관계로 이해하기 좋음

### 세부 결정

- **Prisma Client 싱글톤**: Next.js hot reload 대응 (globalThis 패턴)
- **directUrl**: schema.prisma에 UNPOOLED URL 설정, 마이그레이션 시 풀러 우회
- **빌드 스크립트**: `prisma generate && prisma migrate deploy && next build`

## R-005: 배포 전환

**Decision**: Vercel Hobby 플랜 (GitHub Pages에서 전환)
**Rationale**: Next.js SSR 네이티브 지원. Neon 직접 통합. 무료 티어로 충분.
**Alternatives considered**:
- GitHub Pages 유지: static export만 가능, SSR/API Routes 불가
- AppPaaS: Phase 1에서 빌드 실패 경험. React 20 제한

### 세부 결정

- **전환 방법**: next.config.ts에서 `output: "export"` 제거
- **환경변수**: Vercel Dashboard에서 관리 (AUTH_SECRET, AUTH_GOOGLE_*, DATABASE_URL)
- **도메인**: trip.idean.me를 Vercel로 재연결
- **한도**: 함수 호출 100만/월, 빌드 6,000분/월, 런타임 로그 1시간

## R-006: 초대 시스템

**Decision**: 불투명 랜덤 토큰 + DB 저장 + 7일 만료
**Rationale**: JWT보다 단순하고 즉시 폐기 가능. crypto.randomBytes(32)로 256비트 엔트로피.
**Alternatives considered**:
- JWT 기반 초대: 서명 검증만으로 유효성 확인 가능하나, 폐기 불가 (DB 조회 필요하면 JWT 장점 소실)
- 이메일 매직 링크: Auth.js 매직 링크와 혼동 가능, 별도 플로우 유지가 명확

### 초대 플로우

1. 소유자가 이메일 입력 → 서버에서 토큰 생성 + Invitation 레코드 저장
2. 초대 링크 생성: `/invite/{token}`
3. 초대자 클릭 → 비로그인이면 로그인 리다이렉트 → 로그인 후 초대 페이지로 복귀
4. 수락 시: Member 레코드 생성 + Invitation 상태 ACCEPTED로 변경 (트랜잭션)
5. 만료/중복 초대: 기존 PENDING 초대를 EXPIRED 처리 후 새 토큰 발급

## 구현 순서 (권장)

1. `output: "export"` 제거 + Vercel 배포 설정
2. Neon 통합 + Prisma 스키마 + 마이그레이션
3. Auth.js 설정 (split-file 패턴) + Google OAuth
4. 기존 마크다운 데이터 마이그레이션 스크립트
5. Trip/Day CRUD (API Routes + Server Actions)
6. 팀 초대 시스템 (토큰 기반)
7. 권한 검증 (미들웨어 + 서버 사이드)
