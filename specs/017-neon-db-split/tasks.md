# Tasks: Neon DB 환경별 분리 (v2.7.2)

## US1 - dev/prod 격리 (P1)

인프라 작업은 세션 중 완료(수동 실행). 본 태스크는 기록 및 문서 반영.

- [x] T001 neondb_dev database 생성 (Neon Postgres) [artifact: .specify/state/submit-ready.json] [why: env-split]
- [x] T002 Vercel env 변수 7종 Production/Preview/Development 스코프 분리 [artifact: .specify/state/submit-ready.json] [why: env-split]
- [x] T003 neondb_dev에 prisma db push + migrate resolve 16종 [artifact: .specify/state/submit-ready.json] [why: model-sync]

## US2 - 문서 반영 (P2)

- [ ] T010 CLAUDE.md "DB 마이그레이션" 섹션 갱신 — 공유 DB 제약 해제, 신규 디시플린 정리 [artifact: CLAUDE.md] [why: docs-update]

## 릴리즈 준비

- [ ] T020 towncrier 단편 [artifact: changes/318.chore.md] [why: verify-split]
- [ ] T021 quickstart Evidence [artifact: specs/017-neon-db-split/quickstart.md] [why: verify-split]
