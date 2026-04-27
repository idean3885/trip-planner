# ADR-0005: 무중단 DB 마이그레이션은 Expand-and-Contract 패턴으로 진행한다

- **Status**: Accepted
- **Date**: 2026-04-27
- **Scope**: 모든 DB 스키마 변경 (Prisma migration), 외부 데이터 모델 재설계 (캘린더 모델 등), 파괴적 컬럼/테이블 제거
- **Related**: [ADR-0003 per-trip-shared-calendar](./0003-per-trip-shared-calendar.md)

## Context

trip-planner는 1인 개발 + Vercel atomic deploy 환경이라 다운타임 자체는 거의 발생하지 않지만, **배포 중간 시점**에는 항상 N-1 호환성 문제가 잠복한다.

- Vercel 배포는 빌드 → 신규 람다 활성 → 구 람다 점진 종료 흐름. 짧지만 0이 아닌 시간 동안 두 버전이 같은 DB를 본다.
- preview/dev는 별도 DB(neondb_dev, #318)로 분리됐지만 production은 단일 `neondb`. production 마이그레이션 + 신코드 배포의 순서를 잘못 잡으면 구 코드가 새 스키마를 못 읽거나 신 코드가 옛 스키마를 못 쓰는 짧은 창이 생긴다.
- 동시 다발 PR이 같은 영역의 모델을 만질 때 마이그레이션 충돌은 코드 충돌보다 늦게 드러난다.

세 번의 사례에서 이 패턴이 반복적으로 사용됐다:

1. **Day 스키마 재설계** ([spec 015](../../specs/015-day-schema-redesign/) v2.7.0 expand+migrate / [spec 016](../../specs/016-sortorder-drop/) v2.7.1 contract). `Day.sortOrder` 컬럼을 `(date - trip.startDate) + 1` 파생값으로 대체.
2. **GCal 공유 모델 재설계** ([spec 019](../../specs/019-gcal-shared-flow/) v2.9.0 expand. `GCalLink` 레거시 contract는 v2.11.0+ 후속).
3. **이벤트 매핑 모델 재설계** ([spec 022](../../specs/022-gcal-legacy-contract/) v2.10.0 매핑 expand. 레거시 테이블 DROP은 후속).

세 번 반복되며 공용어가 됐고, 외부에 정형 명칭(Scott Ambler *Refactoring Databases* 2006의 "Expand-and-Contract" 또는 Martin Fowler의 "ParallelChange")이 존재한다는 사실도 합의됐다. 더 이상 "이번엔 어떻게 안전하게 빼지?"를 매번 즉흥 판단할 필요 없이 패턴 이름으로 바로 공통 언어가 형성되는 단계.

## Decision

파괴적 변경(컬럼·테이블 DROP, 제약 변경, 비호환 데이터 형식 변환 등)은 **세 단계 expand-and-contract**로 분해한다.

1. **Expand** — 신규 컬럼·테이블·제약을 **추가만** 한다. 기존 컬럼·테이블은 그대로. 구 코드가 깨지지 않는 범위에서 신 코드가 새 모델을 읽기/쓰기 시작.
2. **Migrate** — 백필. 신·구 모델이 양립한 채로 데이터를 옮기거나 신 모델을 정본으로 승격.
3. **Contract** — 구 모델을 DROP. 단, **구 코드가 프로덕션에서 완전히 사라진 뒤** 별도 릴리즈로.

각 단계는 별도 PR + 별도 릴리즈로 분리한다. expand와 contract를 한 PR에 묶지 않는다.

### 구현 규칙

- **마이그레이션 헤더 강제** — Prisma migration SQL 첫 10줄 안에 `[migration-type: schema-only | data-migration]` 메타태그 포함 (speckit 하네스 `validate-migration-meta.sh`가 검증).
- **expand는 schema-only가 기본** — 기존 데이터 변형 없는 추가만. data-migration이 필요하면 별도 단계로 분리.
- **contract는 후속 릴리즈로 분리** — expand가 머지된 뒤 최소 1개 릴리즈 사이클 이상 관찰 후. 같은 릴리즈에서 expand+contract 동시 진행 금지.
- **API 스키마 호환** — v1 API는 응답 필드를 보존하되 내부적으로 새 모델에서 동적 계산해도 무방. (예: v2.7.1 contract 시 `sortOrder` 컬럼은 DROP하되 v1 응답의 `sortOrder` 키는 dayNumber 동적 계산으로 그대로 응답해 MCP 호환 100% 유지)

### 시각화

```
시점 A         시점 B         시점 C
[expand]  →   [migrate]  →   [contract]
신모델 추가   백필 + 정본 승격  구모델 DROP
구코드 호환    양립               신코드 단독
```

## Consequences

**Positive**:
- 배포 중 어느 시점에도 구/신 코드가 동시 동작 가능 (N-1 호환)
- 단계가 분리되어 롤백 단위가 작음 — 문제 발견 시 contract만 되돌릴 수 있음
- 공용어 정착으로 신규 마이그레이션 논의가 빨라짐 ("이번 PR은 expand만, contract는 v2.X.X에서")
- speckit 하네스의 `[migration-type]` 헤더와 자연스럽게 연동

**Negative**:
- 릴리즈 1번이 2~3번이 됨 (expand → migrate → contract)
- 중간 단계에서 구·신 모델이 병존해 일시적으로 스키마가 비대칭
- contract 시점을 잊어버리면 "임시" 레거시 모델이 영구화되는 위험 — 이를 막기 위해 expand 단편(`changes/<이슈>.feat.md`)에 contract 후속 이슈 번호를 명시 권고

## Alternatives Considered

1. **Big-bang 마이그레이션** — 한 PR에서 컬럼 DROP + 코드 변경 + 데이터 백필. 1인 개발 + Vercel atomic deploy면 "괜찮을 것 같다"가 첫 직관. 그러나 production DB가 단일이라 배포 중간 짧은 창에서 구 람다가 신 스키마를 못 읽고 500을 뱉는 사례가 v2.7 이전에 발견됐다(고객 영향은 없었지만 로그상 명백). 일관 원칙으로 배제.

2. **Feature flag로 두 모델 동시 운영** — 외부 의존성 없는 코드 경로엔 적합하지만 DB 스키마 자체에는 적용이 어려움. 캘린더처럼 외부 API와 결합된 모델은 토글로 갈음할 수 없음.

3. **DB 트리거로 양방향 동기화** — Postgres 트리거로 구·신 컬럼을 양방향 동기화. 무중단 보장은 강하지만 1인 운영의 디버깅·관찰 비용이 비대칭으로 큼. ADR-0002 "라이브러리·표준 우선" 정신상 배제.

## How to apply

- 새 PR이 컬럼/테이블 DROP을 포함하면 본 ADR을 인용해 단계 분리 요청
- spec 본문에 "이 작업은 expand-and-contract의 expand/migrate/contract 단계 중 어디에 해당하는가" 명시
- contract 후속 이슈는 expand 머지 시 동시 생성 (잊어버림 방지)
- 블로그 포스팅(외부 공유)은 spec 015/016 contract 사례를 본 ADR과 함께 회고 형식으로 작성 예정 — 시점은 v2.10.0 이후 적기에
