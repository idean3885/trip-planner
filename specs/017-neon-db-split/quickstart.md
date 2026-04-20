# Quickstart: Neon DB 환경별 분리

## 사전 조건

- Vercel CLI 로그인 + trip-planner 프로젝트 링크
- Neon Postgres 접근 권한 (프로젝트 admin)

## 검증 체크리스트

- [ ] `vercel env ls`에서 `DATABASE_URL`이 Production/Preview/Development 3개 라인으로 각각 나타남
- [ ] 프로덕션 (`trip.idean.me`) 정상 — 기존 Trip 데이터 그대로
- [ ] Development 배포 (`dev.trip.idean.me`)에 트립 추가 시 neondb_dev에 저장 — prod에 영향 없음
- [ ] `npx prisma migrate status` (dev DB URL) → `Database schema is up to date!`

### Evidence

**자동**:
- Vercel CLI: `vercel env ls` 결과 라인별 스코프 확인
- DB 접속: `SELECT datname FROM pg_database` → `neondb`, `neondb_dev` 둘 다 존재

**수동 (배포 후)**:
- dev.trip.idean.me 로그인 → Trip 목록 비어 있음 확인 (prod 1건과 분리)
- trip.idean.me 로그인 → 기존 Trip 1건 보존 확인

## 롤백

```
# Vercel env 원복
vercel env rm DATABASE_URL preview -y
vercel env add DATABASE_URL preview "" --value <neondb-url> --yes
# (7종 모두 동일 절차)

# neondb_dev 정리
psql <admin-url> -c 'DROP DATABASE neondb_dev'
```
