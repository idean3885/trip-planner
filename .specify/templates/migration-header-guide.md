# Migration Type Guide

모든 `prisma/migrations/*/` 디렉토리는 마이그레이션 타입을 선언해야 한다. `validate-migration-meta.sh`가 두 방식을 순차 확인한다.

## 선언 방식 (우선순위)

### 1) 사이드카 파일 (권장)

디렉토리 내부에 `migration-type` 파일을 두고 한 줄 값만 기록.

```
prisma/migrations/20260417_backfill_trip_owner/
├── migration.sql
└── migration-type        ← "schema-only" 또는 "data-migration" 한 줄
```

**장점**: `migration.sql` 파일을 건드리지 않으므로 Prisma checksum 영향 없음. 이미 프로덕션에 적용된 레거시 마이그레이션에도 소급 가능.

### 2) SQL 주석 (fallback)

새 마이그레이션을 처음 작성할 때 상단 10줄 안에 주석으로 기록해도 된다.

```sql
-- [migration-type: schema-only]
CREATE TYPE "Status" AS ENUM ('A','B');
```

⚠️ 이미 `prisma migrate deploy`로 적용된 마이그레이션 SQL은 수정 금지 (Prisma drift 감지로 배포 차단).

## 값 정의

- `schema-only` — 스키마 구조만 변경(ADD/DROP COLUMN, ENUM 추가 등). 기존 데이터 재해석 필요 없는 마이그레이션.
- `data-migration` — 기존 데이터 보정/백필(UPDATE 구문, enum 값 소급 반영 등)을 포함. 보통 `schema-only` 마이그레이션에 뒤따르는 2단계 짝.

## expand-and-contract 규약

DB 스키마 변경이 plan.md에 명시된 bullet은 **두 개의 마이그레이션**을 가지는 것이 원칙이다:

1. `schema-only` — 새 컬럼·enum 값 추가 (기존 레코드에 대한 NULL/default만으로 안전).
2. `data-migration` — 기존 레코드를 신규 의미에 맞게 보정 (예: HOST 중 생성자를 OWNER로 승격).

`data-migration`을 생략하면 프로덕션에서 권한/의미가 깨진 상태가 유지된다(참고: 회고 #191).

## PR 시 검증

- `speckit-gate.yml`이 PR에 변경된 피처에 대해 `validate-migration-meta.sh --feature <dir>`를 실행한다.
- plan.md에 `schema`/`enum`/`스키마`/`컬럼` 키워드를 포함한 top-level bullet이 있으면, 같은 `[why]` 태그를 가진 `[migration-type: data-migration]` 태스크(또는 `-backfill` suffix, 또는 설명에 "보정"/"backfill" 포함)가 tasks.md에 존재해야 한다.
- 없으면 `phase=contract`에서 차단, `expand`/`migrate`에서 경고.

## 재작성·롤백

헤더를 잘못 기재하여 커밋된 경우, 해당 마이그레이션을 되돌리는 **별도 마이그레이션**을 추가한다. 이미 적용된 마이그레이션 파일을 직접 수정하지 않는다(Prisma가 drift 감지로 차단).
