# Implementation Plan: Neon DB 환경별 분리

**Branch**: `017-neon-db-split` | **Date**: 2026-04-20 | **Spec**: ./spec.md

## Summary

단일 Neon 프로젝트 내 `neondb`/`neondb_dev` 2개 database로 환경 분리. Vercel env 변수를 스코프별로 재설정해 Production만 prod DB에 접근, Preview/Development는 dev DB에 접근. 코드 변경은 CLAUDE.md 갱신만.

## Coverage Targets

- Vercel env 변수 스코프 분리 [why: env-split] (인프라 — CLI로 실행됨)
- dev DB 모델 동기화 [why: model-sync] (인프라 — `prisma db push` + `migrate resolve` 실행됨)
- CLAUDE.md 문서 갱신 [why: docs-update]
- 배포 검증 [why: verify-split]

## Technical Context

**Language/Version**: Node.js 20+, TypeScript 5.x (env 스크립트만)
**Primary Dependencies**: Vercel CLI, Prisma, `pg`
**Storage**: Neon Postgres (단일 프로젝트, 2 database)
**Testing**: 수동 (Vercel env ls + 배포 확인)
**Constraints**: Vercel 무료 플랜, Neon 0.5GB

## Project Structure

```
specs/017-neon-db-split/
├── spec.md
├── plan.md
├── tasks.md
└── quickstart.md

CLAUDE.md                     # "DB 마이그레이션" 섹션 갱신 (공유 DB 표현 제거)
```

## Implementation Notes (실행 기록)

이미 완료된 인프라 작업 (2026-04-20 세션):

1. `CREATE DATABASE neondb_dev` (Neon Postgres, postgres DB 경유)
2. `prisma db push` — 최신 스키마 적용
3. `prisma migrate resolve --applied` 16종 — 히스토리 주입 (차후 `migrate deploy` 호환)
4. Vercel env 재설정:
   - `vercel env rm <NAME> <scope> -y` + `vercel env add <NAME> <scope> "" --value <val> --yes`
   - 대상 변수 7종: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_PGDATABASE`, `DATABASE_POSTGRES_DATABASE`, `DATABASE_POSTGRES_PRISMA_URL`, `DATABASE_POSTGRES_URL`, `DATABASE_POSTGRES_URL_NON_POOLING`
   - 변환 규칙: URL 변수는 `/neondb` → `/neondb_dev`, 이름 변수는 `neondb` → `neondb_dev`
5. 본 PR(코드 변경)은 CLAUDE.md 갱신 + 발동 커밋(배포 트리거) 역할

## Risks

- Vercel CLI `env rm`은 기존 공유 스코프를 전체 삭제하는 경향 — Production 스코프 복구 누락 시 prod 다운. **완화**: 세션 중 Production 값 복구 확인 (prod 엔드포인트 200 응답 확인)
- `neondb_dev`도 같은 Neon 호스트 공유 — 완전 격리 아님. compute quota 공유. **완화**: 현 규모에선 무시
- `prisma migrate dev`는 여전히 호스트 연결이라 prod에도 영향 가능 — CLAUDE.md에서 계속 금지 유지

## Rollback

- env 변수를 Preview/Development 값을 원래 neondb 값으로 되돌리기
- `DROP DATABASE neondb_dev` (데이터 없음)
