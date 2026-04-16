-- Step 1 (Expand): 신규 Timestamptz 컬럼 추가 + 기존 데이터 백필
-- 기존 start_time/end_time (VarChar) 컬럼은 유지한다 (무중단 배포).

-- 1. 신규 컬럼 추가 (nullable)
ALTER TABLE "activities" ADD COLUMN "start_time_ts" TIMESTAMPTZ(3);
ALTER TABLE "activities" ADD COLUMN "end_time_ts" TIMESTAMPTZ(3);

-- 2. 기존 데이터 백필: day.date + HH:mm(앞 5자) → timestamp
UPDATE "activities" a
SET "start_time_ts" = d."date"::date + SUBSTRING(a."start_time" FROM 1 FOR 5)::time
FROM "days" d
WHERE a."day_id" = d."id" AND a."start_time" IS NOT NULL;

UPDATE "activities" a
SET "end_time_ts" = d."date"::date + SUBSTRING(a."end_time" FROM 1 FOR 5)::time
FROM "days" d
WHERE a."day_id" = d."id" AND a."end_time" IS NOT NULL;

-- 3. 신규 컬럼 인덱스
CREATE INDEX "activities_day_id_start_time_ts_idx" ON "activities"("day_id", "start_time_ts");
