# Feature Specification: Neon DB 환경별 분리

**Feature Branch**: `017-neon-db-split`
**Created**: 2026-04-20
**Status**: Approved (인프라 작업 완료, CLAUDE.md 갱신 필요)
**Input**: #318 Neon DB 환경별 분리 — dev/prod 격리

## Clarifications

1. **단일 Neon 프로젝트 + database 2개 방식 채택** — 무료 티어의 0.5GB 한도 내에서 `neondb`(Production)과 `neondb_dev`(Preview/Development) 분리.
2. **Vercel env 변수 환경별 분기** — 기존 "모든 환경 공유" → Production은 `neondb`, Preview/Development는 `neondb_dev`를 참조하도록 `DATABASE_*` 변수 8종을 스코프별로 재설정.
3. **모델 동기화** — `neondb_dev`는 `prisma db push` 후 `prisma migrate resolve --applied`로 마이그레이션 히스토리 주입. 향후 Vercel preview build의 `prisma migrate deploy`가 정상 작동.
4. **dev 데이터 초기 상태** — 비어 있음(0 trip). prod에서 복제하지 않음. 필요 시 수동 seed.

## Metatag Conventions

본 피처의 tasks.md·plan.md는 네 종 메타태그 규약을 따른다.

## User Scenarios & Testing

### User Story 1 - dev 변경이 prod에 영향 없음 (P1)

dev.trip.idean.me에서 트립을 추가/삭제해도 trip.idean.me의 데이터는 변하지 않는다.

**Acceptance**:
1. **Given** dev/prod 분리 완료, **When** dev에서 Trip 추가, **Then** prod Trip 목록 불변

### User Story 2 - preview build 마이그레이션이 prod DB에 영향 없음 (P2)

PR preview build가 `prisma migrate deploy` 수행해도 `neondb_dev`에만 적용되며 `neondb`는 영향받지 않음. #317 같은 preview-build-timing 위험 구조적 해소.

**Acceptance**:
1. **Given** 차기 migration PR, **When** preview build 실행, **Then** `neondb`는 변화 없음

## Functional Requirements

- **FR-001**: `DATABASE_URL` 등 8종 변수를 Production/Preview/Development 스코프별로 분리 — Prod는 `neondb`, Preview/Dev는 `neondb_dev`
- **FR-002**: `neondb_dev`에 최신 모델 적용 + 마이그레이션 히스토리 주입
- **FR-003**: CLAUDE.md "DB 마이그레이션" 섹션 갱신 — "공유 DB 제약" 해제, `prisma migrate dev`는 여전히 호스트 공유이므로 주의 유지

## Success Criteria

- **SC-001**: `vercel env ls`에서 Production/Preview/Development 각 스코프에 개별 `DATABASE_URL` 변수 확인
- **SC-002**: dev.trip.idean.me 배포 후 DB 쿼리 정상 (trip 0건 조회)
- **SC-003**: trip.idean.me 기존 데이터 유지 (trip 1건 조회)

## Key Entities

- 변화 없음 (모델 동일, DB 인스턴스만 분리)

## Out of Scope

- dev DB seed 데이터
- Neon 브랜치 기능 활용 (옵션 A)
- 완전 격리(별도 Neon 프로젝트)
