# Quickstart: Day.sortOrder 컬럼 DROP (v2.7.1)

## 사전 조건

- Node.js 20+
- `.env.local`에 `DATABASE_URL_UNPOOLED` 등 채워짐
- Prisma client 재생성: `npx prisma generate`

## 실행

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

## 검증 체크리스트

- [ ] `psql` 등 도구로 `\d days` 확인 — `sort_order` 컬럼 없음
- [ ] `/api/trips/1` 응답 — `days[].sortOrder` 정수 키 존재 (동적 계산)
- [ ] `/api/v2/trips/1` 응답 — `days[].dayNumber` 정수 (변화 없음)
- [ ] 웹 UI `/trips/1` — DAY N 표시 정상
- [ ] MCP `get_trip(1)` — `[Day 1]`...`[Day N]` 정상

### Evidence

**자동**:
- `pnpm test tests/api/v1-sortorder-dynamic.test.ts` — v1 응답에 sortOrder 동적 부착
- 기존 `v1-compat.test.ts` 재실행 — 응답 스키마 변경 없음 회귀
- 기존 `v2-days.test.ts` 재실행 — v2 dayNumber 변화 없음

**수동 (배포 후)**:
- `curl https://trip.idean.me/api/trips/1 | jq '.days[0].sortOrder'` → 정수
- prisma studio 또는 psql로 `days` 테이블 컬럼 확인

## 롤백

```sql
ALTER TABLE "days" ADD COLUMN "sort_order" INT NOT NULL DEFAULT 0;
UPDATE "days" d
SET sort_order = ((d.date::date - t.start_date::date) + 1)
FROM "trips" t WHERE d.trip_id = t.id;
```
