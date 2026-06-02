# Implementation Plan: 활동 컬렉션 읽기 REST 표현 정비

**Branch**: `052-activity-collection-read` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/052-activity-collection-read/spec.md`

## Summary

여행 읽기가 일자별 활동 **개수만** 노출하고(트립 GET의 Prisma include가 `_count.activities`), 활동 표현을 주는 일자 단위 읽기는 **API 문서에 없어** 소비자가 발견할 수 없는 상태를 정비한다. 접근:

1. 이미 활동 배열을 반환하는 읽기(일자 단건 GET)를 **OpenAPI 문서에 노출**한다(미문서화 해소 — US2).
2. 트립 단건 GET에 **opt-in 확장**(`?include=activities`)을 추가해, 요청 시 days→activities 전체 표현을 한 번에 반환한다(트립 레벨 표현 + 일정 개관 — US1·US3). 미지정 시 기존 개수 응답을 유지(하위호환).
3. 위 읽기 동작과 엣지(빈 컬렉션·not-found·비멤버 거부)를 회귀 테스트로 고정.

스키마 변경 없음(읽기 전용). MCP·FE 변경 없음.

## Coverage Targets

- 활동 표현 읽기 경로 OpenAPI 문서화(일자 단건 GET 응답 + Day.activities 응답 정의/예시; 활동 목록 GET 응답 정합) [why: read-doc] [multi-step: 2]
- 트립 GET opt-in 활동 확장(`?include=activities` → days.activities 전체 표현, 미지정 시 개수 유지) + 문서화 [why: trip-expand] [multi-step: 2]
- 읽기 동작·엣지 회귀 테스트(확장 on/off, 일자 활동, 빈 컬렉션, 비멤버·not-found) [why: read-tests] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router, Route Handlers)
**Primary Dependencies**: 신규 의존성 없음 — 기존 ORM(TCP adapter)·인증(세션/PAT)·OpenAPI 정의 모듈 재사용
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`). **마이그레이션 없음(읽기 전용)**
**Testing**: vitest (route handler 단위/통합). 자가 검증 시 `npx vitest run` 전체 1회 의무
**Target Platform**: Vercel (Route Handlers)
**Project Type**: web-service (API) — FE 변경 없음
**Performance Goals**: 확장 응답이 일자 수에 선형. 트립 1건 일정 개관을 **문서화된 1콜**로 가능(`?include=activities`)
**Constraints**: 하위호환 — 기존 트립 GET 기본 응답(개수) 불변. 활동 표현은 부동 시간 원칙(VII)에 따라 `startTimezone`/`endTimezone`을 포함해 노출
**Scale/Scope**: 1인 사용자, 트립당 수~수십 일자·활동. 성능보다 발견성·왕복 수가 기준

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 VII(부동 시간)**: 활동 표현에 `startTime`/`endTime`과 함께 `startTimezone`/`endTimezone`을 노출해 시각 해석을 보존 → 준수.
- **라이브러리 우선(ADR-0002)**: 신규 라이브러리 없음. 기존 모듈만 사용 → 해당 없음.
- **스펙 우선·기술 중립**: spec은 WHAT/WHY만(중립성 린트 통과), 구체 수단(`?include=` 등)은 본 plan에서 결정 → 준수.
- **무중단 마이그레이션(expand-contract)**: 스키마 변경 없음 → 해당 없음.
- 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/052-activity-collection-read/
├── plan.md              # 본 파일
├── spec.md              # 완료
├── research.md          # Phase 0 (해당 시)
├── quickstart.md        # Phase 1 — Evidence 규약
├── contracts/           # Phase 1 — 읽기 응답 스키마 계약
└── tasks.md             # /speckit.tasks 산출(본 단계 아님)
```

### Source Code (repository root)

```text
src/
├── app/api/trips/[id]/route.ts                         # 트립 GET — opt-in include=activities 확장
├── app/api/trips/[id]/days/[dayId]/route.ts            # 일자 단건 GET — 이미 activities 반환(문서화 대상)
├── app/api/trips/[id]/days/[dayId]/activities/route.ts # 활동 목록 GET — 이미 전체 반환(문서 정합 확인)
└── lib/openapi.ts                                       # OpenAPI 정의 — 일자 GET·트립 확장 응답 스키마/예시 추가

tests/
└── api/                                                 # 트립 확장 on/off·일자 활동·엣지 회귀 테스트
```

**Structure Decision**: web-service 단일 프로젝트. 변경은 읽기 라우트 핸들러 3개와 OpenAPI 정의 모듈, 그리고 테스트에 한정. 데이터 모델·FE·MCP 불변.

## Complexity Tracking

> 위반 없음 — 비움.
