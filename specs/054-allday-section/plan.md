# Implementation Plan: 여행 상세 종일 섹션

**Branch**: `054-allday-section` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/054-allday-section/spec.md`

## Summary

활동에 종일(all-day) 여부를 도입하고, 종일 활동을 그 날 활동 영역 최상단의 별도 섹션(기본 접힘)으로 분리한다. 종일 활동은 외부 캘린더에 날짜 단위 종일 이벤트로 반영한다.

접근:
1. `Activity.allDay`(Boolean, 기본 false) 컬럼 추가 — 마이그레이션 schema-only(additive expand, 기존 행은 false로 동작 불변).
2. 활동 작성/편집 폼에 종일 토글 — 종일이면 시각 입력 생략. 저장 시 종일 활동은 시각 앵커를 그 날 날짜(00:00)로 두어 동기화·정렬 기준을 확보(표시는 "종일").
3. 활동 목록을 종일/시간 두 묶음으로 분리 — 종일은 최상단 접힘 섹션(기존 `<details>/<summary>` 패턴 재사용), 시간은 그 아래 기존 순서.
4. 카드: 종일이면 시간 범위 대신 "종일" 표기.
5. ICS: 종일 활동은 `VALUE=DATE` 종일 이벤트로, 시간 활동은 기존 형식.
6. 읽기 응답·OpenAPI에 allDay 노출. 회귀·신규 테스트.

여러 날 가로 스패닝은 범위 밖(후속). MCP 변경 없음.

## Coverage Targets

- Activity 종일(all-day) 여부 도입 + 마이그레이션 산출(additive, 기본 false라 backfill 불필요) [why: allday-schema] [multi-step: 2]
- 종일/시간 분리 렌더 — 최상단 접힘 종일 섹션 [why: allday-section] [multi-step: 2]
- 종일 지정 폼(시각 생략·앵커) + 카드 "종일" 표시 + API 저장 [why: allday-input] [multi-step: 2]
- 종일 활동 ICS 날짜 단위 반영 [why: allday-ics]
- allDay 노출(읽기·OpenAPI) + 회귀/신규 테스트 [why: allday-tests] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16, React 19)
**Primary Dependencies**: 신규 의존성 없음 — shadcn `<details>/<summary>` 접기 패턴·기존 폼/카드/리스트·ICS 모듈 재사용
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`). **마이그레이션 1건(schema-only): `activities.is_all_day` 컬럼 추가, 기본 false**
**Testing**: vitest (컴포넌트 렌더·라우트·ICS). 자가 검증 전체 1회 + 커버리지 100%
**Target Platform**: Vercel (웹앱)
**Performance Goals**: 분리 렌더는 활동 수에 선형, 외형 토큰 불변
**Constraints**: 기존 활동(allDay 미지정)은 false로 동작 불변(하위호환). 종일 활동 시각 앵커는 그 날 00:00 — 표시는 "종일", 부동 시간 원칙 VII 유지
**Scale/Scope**: 1인 사용자, 하루 수~수십 활동

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 VII(부동 시간)**: 종일 시각 앵커는 그 날 날짜 기준. 시간 활동의 시각/시간대 표현은 불변 → 준수.
- **무중단 마이그레이션(expand-contract)**: 컬럼 추가는 기본값 있는 additive expand. 기존 행 backfill 불필요(기본 false가 곧 정답) → 단독 expand로 안전.
- **라이브러리 우선(ADR-0002)**: 신규 라이브러리 없음 → 해당 없음.
- **스펙 우선·기술 중립**: spec WHAT/WHY(중립성 통과), 수단은 본 plan에서 → 준수.
- 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/054-allday-section/
├── plan.md
├── spec.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                          # Activity.allDay 추가
└── migrations/20260603000000_add_activity_allday/migration.sql  # schema-only, is_all_day 컬럼

src/
├── components/ActivityList.tsx                             # 종일/시간 분리 + 최상단 접힘 섹션
├── components/ActivityCard.tsx                             # 종일 시 "종일" 표시
├── components/ActivityForm.tsx                             # 종일 토글 + 시각 생략
├── app/api/trips/<id>/days/<dayId>/activities/route.ts    # POST allDay 저장(+시각 앵커)
├── app/api/trips/<id>/days/<dayId>/activities/<activityId>/route.ts  # PUT allDay
├── lib/openapi.ts                                          # Activity allDay + POST/PUT 바디
└── lib/calendar/ics.ts                                     # 종일 VALUE=DATE 분기

tests/
├── components/ ...                                         # 분리 렌더·폼·카드
└── api/ ...                                                # allDay 저장·ICS 종일
```

**Structure Decision**: web-service + 웹앱. 마이그레이션 1건(schema-only) + 모델/타입/라우트/폼/카드/리스트/ICS + 테스트. 외형 토큰 불변, 기존 동작 하위호환.

## Complexity Tracking

> 위반 없음 — 비움.
