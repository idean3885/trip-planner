# Research — 022 레거시 매핑 expand

**Created**: 2026-04-23
**Scope**: plan.md Phase 0.

## Decision 1 — 구 테이블 유지 전략

- **Decision**: v2.10.0에서 `gcal_links`·`gcal_event_mappings` 테이블을 **drop하지 않는다**. 신규 `trip_calendar_event_mappings`만 추가.
- **Rationale**: Vercel 배포는 마이그레이션 먼저·새 코드 뒤. 과도 구간에 구 인스턴스가 구 테이블을 읽으면 테이블이 있어야 500이 안 난다. 데이터 중복은 짧게 허용하되, 코드가 신규 테이블만 쓰면 구 테이블 레코드는 더 이상 변하지 않음.
- **Alternatives**: 단일 PR drop — 과도 구간 5xx 위험.

## Decision 2 — 매핑 복사 조인 조건

- **Decision**: `JOIN gcal_links ON gcal_event_mappings.link_id = gcal_links.id JOIN trip_calendar_links ON tcl.calendar_id = gl.calendar_id AND tcl.trip_id = gl.trip_id` 기준 단일 `INSERT ... SELECT`.
- **Rationale**: bridge 로직(`sync/route.ts`)이 정확히 이 키로 bridgeLink를 생성·재사용해 왔다. 조인 1:1 결정적.
- **Alternatives**: 사용자 기준 조인 — 주인 전환 시점 매핑 문제 발생 가능.

## Decision 3 — 410 Gone 응답 본문

- **Decision**: `{ error: "gone", message: "This endpoint has been retired. See spec 022 (v2.10.0 contract expand)." }`, status 410. 모든 메소드·파라미터 공통.
- **Rationale**: 의미 명시 + 내부 로깅으로 잔존 호출 관찰 가능.

## Decision 4 — 코드 정리 범위

- **Decision**: `src/lib/gcal/sync.ts`·`src/app/api/v2/trips/<id>/calendar/sync/route.ts`만 편집. 레거시 `link/sync/status` 라우트 파일은 내용만 410 핸들러로 교체.
- **Rationale**: 활성 호출 경로에서 레거시 쓰기·읽기를 제거하는 것이 목표. 모델 정의·파일 존재는 후속 contract 릴리즈 대상.

## Decision 5 — 테스트 전략

- **Decision**:
  - `tests/api/v2-gcal-sync.test.ts` 신설 — sync가 신규 매핑 테이블에만 쓰기/읽기 검증(Prisma mock).
  - `tests/api/gcal-legacy-gone.test.ts` 신설 — 각 레거시 라우트가 410 반환 검증.
  - 기존 `tests/lib/gcal/*`가 있다면 모델 이름만 교체.
- **Rationale**: 회귀 방지 + 라우트 종료 확인.

## Open Questions

없음. Phase 1 진행 가능.
