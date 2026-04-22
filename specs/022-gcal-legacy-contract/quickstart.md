# Quickstart — 022 레거시 매핑 expand

**Created**: 2026-04-23
**Purpose**: 재현·회귀 방지. 자동 테스트 정본 + dev 재현 1회.

## 사전 조건

- dev 환경에 공유 캘린더 연결된 여행 1건(기존 이벤트 매핑이 있는 상태).
- 주인 계정 1, 호스트 계정 1.

## S1 — 매핑 데이터 복사 무손실

1. 마이그레이션 실행 전 `SELECT COUNT(*) FROM gcal_event_mappings`.
2. `prisma migrate deploy`로 v2.10.0 마이그레이션 반영.
3. 실행 후 `SELECT COUNT(*) FROM trip_calendar_event_mappings` — (1)과 동일해야 함.

## S2 — 신규 경로로만 쓰기

1. 주인 계정으로 "다시 반영하기" 실행.
2. 이후 `SELECT COUNT(*) FROM gcal_event_mappings WHERE updated_at > '직전_타임스탬프'` = 0 확인.
3. `SELECT COUNT(*) FROM trip_calendar_event_mappings WHERE updated_at > '직전_타임스탬프'` ≥ 1 확인.

## S3 — 레거시 API 410

1. `curl -i -X PATCH dev.trip.idean.me/api/trips/5/gcal/sync`.
2. 응답 Status `410`, Body `{"error":"gone",...}` 확인.

## S4 — 배포 과도 구간 안전

1. 로컬에서 구 버전 코드(v2.9.2) 인스턴스와 신 버전 코드(v2.10.0) 인스턴스를 동시 실행.
2. 양쪽 모두 기존 여행 페이지 로드 → 5xx 없음 + UI 동작 유지.

## Evidence

### 자동 테스트 (정본)

- `tests/api/v2-gcal-sync.test.ts` — sync 라우트가 신규 매핑 테이블에만 쓰기/읽기함을 Prisma mock으로 검증.
- `tests/api/gcal-legacy-gone.test.ts` — 레거시 라우트 3종이 410 반환 검증.

### 수동 체크 (dev 재현)

- [ ] S1 — 매핑 레코드 수 일치
- [ ] S2 — 신규 테이블에만 쓰기
- [ ] S3 — 레거시 라우트 410
- [ ] S4 — 과도 구간 에러 0

## Rollback

- Prisma migration rollback SQL로 신규 테이블 drop.
- 구 테이블·구 코드 참조는 유지되어 있으므로 구 배포 revert 즉시 기능 복구.
