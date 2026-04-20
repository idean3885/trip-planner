# Quickstart: Day 스키마 재설계 + API v2 신설 (v2.7.0)

## 사전 조건

- Node.js 20+, pnpm/npm
- `.env.local`에 `DATABASE_URL_UNPOOLED` 등 Neon 변수 채워짐 (Vercel env pull)
- 로컬에서 `npx prisma generate` 실행

## 빌드 & 실행

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

## 마이그레이션 적용 (PR 머지 후 자동, 로컬은 deploy로)

```bash
# 절대 prisma migrate dev 사용 금지 (공유 DB)
npx prisma migrate deploy
```

## 검증 체크리스트

- [ ] `/api/trips/1` 응답에 `days[].sortOrder` 정수 (MCP 호환)
- [ ] `/api/v2/trips/1` 응답에 `days[].dayNumber` 정수, `sortOrder` 미포함
- [ ] 웹 UI `/trips/1` 진입 시 모든 Day 카드 "DAY N" 표시 (DAY 0 없음)
- [ ] Day 추가 (Trip 범위 안) → dayNumber 정확
- [ ] Day 추가 (Trip 범위 밖) → Trip.startDate/endDate 자동 확장 + dayNumber 정확
- [ ] MCP `get_trip(1)` 호출 → `[Day 1]`, `[Day 2]` ... 정상

### Evidence

**자동 (CI)**:
- `pnpm test tests/api/v1-compat.test.ts` — v1 sortOrder 응답 보장
- `pnpm test tests/api/v2-days.test.ts` — v2 dayNumber 응답
- `pnpm test tests/api/range-autoexpand.test.ts` — 자동 확장

**수동 (배포 후)**:
- dev.trip.idean.me 접속 → Trip 상세 진입 → DAY N 표시 정상
- `curl https://dev.trip.idean.me/api/trips/1 | jq '.days[0]'` → sortOrder 키 확인
- `curl https://dev.trip.idean.me/api/v2/trips/1 | jq '.days[0]'` → dayNumber 키 확인
- MCP CLI: `claude mcp` 실행 후 trip 도구로 `get_trip` 호출 → 정상 표시

## 롤백 절차

1. Vercel Dashboard → Deployments → 이전 배포 Promote
2. 마이그레이션 롤백 SQL (필요 시):
   ```sql
   ALTER TABLE trips ALTER COLUMN start_date DROP NOT NULL;
   ALTER TABLE trips ALTER COLUMN end_date DROP NOT NULL;
   ALTER TABLE days DROP CONSTRAINT IF EXISTS days_trip_id_date_key;
   ```
