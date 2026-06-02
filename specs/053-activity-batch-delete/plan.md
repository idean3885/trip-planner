# Implementation Plan: 활동·일자 다건 삭제 API

**Branch**: `053-activity-batch-delete` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/053-activity-batch-delete/spec.md`

## Summary

여러 활동·일자를 한 요청으로 지우는 배치 삭제를 추가한다. 단건 삭제는 그대로 둔다(배치는 additive). 레포의 기존 배치 관례(`POST .../promote-batch`: JSON body·부분 성공·`after()` 자동 반영 1회)를 그대로 따른다.

1. 활동 배치 삭제 — `POST /api/trips/{id}/activities/batch-delete` body `{ ids }`. 여행 경계로 묶어 존재하는 식별자만 삭제하고, 삭제·건너뜀을 결과로 반환. 외부 캘린더 자동 반영을 요청당 한 번.
2. 일자 배치 삭제 — `POST /api/trips/{id}/days/batch-delete` body `{ ids }`. 일자 삭제는 활동을 함께 제거(cascade). 동일하게 부분 성공·자동 반영 한 번.
3. 두 경로를 OpenAPI 문서에 노출. 단건 삭제·배치 삭제 회귀 테스트.

데이터 모델 변경 없음(삭제 연산만). MCP·FE 변경 없음.

## Coverage Targets

- 활동 배치 삭제 경로 — 여행 경계 보호·부분 성공 보고·자동 반영 1회 [why: activity-batch] [multi-step: 2]
- 일자 배치 삭제 경로 — 활동 cascade·부분 성공 보고 [why: day-batch] [multi-step: 2]
- 배치 삭제 OpenAPI 문서화(요청·응답·예시) [why: batch-doc]
- 배치·단건 삭제 회귀 테스트(부분 성공·경계·권한·빈 입력) [why: batch-tests] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router, Route Handlers)
**Primary Dependencies**: 신규 의존성 없음 — 기존 인증(`canEdit`)·ORM 일괄 삭제(`deleteMany`)·자동 반영(`triggerCalendarAutoSync`, `after()`) 재사용
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`). **마이그레이션 없음(삭제 연산만)**
**Testing**: vitest (route handler 단위/통합). 자가 검증 시 전체 1회
**Target Platform**: Vercel (Route Handlers)
**Project Type**: web-service (API) — FE 변경 없음
**Performance Goals**: 활동/일자 N개 삭제를 1요청으로(N→1 왕복)
**Constraints**: 여행 경계 안에서만 삭제(권한·소유 검증). 부분 성공 — 무효 식별자는 건너뜀. 단건 삭제 동작 불변
**Scale/Scope**: 1인 사용자, 요청당 수~수십 식별자

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 VI(권한)**: 배치 삭제는 편집 권한(`canEdit`) 필요. 여행 경계 밖 식별자는 건너뜀 → 준수.
- **라이브러리 우선(ADR-0002)**: 신규 라이브러리 없음 → 해당 없음.
- **스펙 우선·기술 중립**: spec은 WHAT/WHY(중립성 통과), 경로·body 형식은 본 plan에서 결정 → 준수.
- **무중단 마이그레이션**: 데이터 모델 변경 없음 → 해당 없음.
- 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/053-activity-batch-delete/
├── plan.md
├── spec.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/api/trips/<id>/activities/batch-delete/route.ts   # 신규 — 활동 배치 삭제 POST
├── app/api/trips/<id>/days/batch-delete/route.ts          # 신규 — 일자 배치 삭제 POST
└── lib/openapi.ts                                          # 두 경로 요청·응답·예시 문서화

tests/
└── api/                                                    # 배치 삭제(부분 성공·경계·권한·빈 입력) + 단건 회귀
```

**Structure Decision**: web-service 단일 프로젝트. 신규 라우트 핸들러 2개 + OpenAPI 정의 + 테스트. 단건 삭제 라우트는 그대로 유지. 기존 `promote-batch` 라우트의 구조(POST·부분 성공·`after()` 자동 반영)를 모델로 한다.

## Complexity Tracking

> 위반 없음 — 비움.
