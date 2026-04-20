# Tasks: Neon DB 환경별 분리 (v2.7.2)

> US1 (dev/prod 격리) 인프라 작업은 세션 중 수동 실행 완료. 산출물은 Neon Postgres의 `neondb_dev` database 생성과 Vercel env 스코프 분리이며, 모두 외부 인프라 상태이므로 tasks 체크박스 대신 plan.md "Implementation Notes (실행 기록)" 섹션에 기록. 본 tasks는 리포 내 산출물만 다룸.

## US2 - 문서 반영 (P2)

- [x] T010 CLAUDE.md "DB 마이그레이션" 섹션 갱신 — 공유 DB 제약 해제, 신규 디시플린 정리 [artifact: CLAUDE.md] [why: docs-update]

## 릴리즈 준비

- [x] T020 towncrier 단편 [artifact: changes/318.chore.md] [why: verify-split]
- [x] T021 quickstart Evidence [artifact: specs/017-neon-db-split/quickstart.md] [why: verify-split]
