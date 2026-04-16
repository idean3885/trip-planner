-- Activity.start_time / end_time: VARCHAR → TIMESTAMPTZ
-- 기존 HH:mm 문자열을 Day.date 기반 timestamp으로 변환.
-- 이미 프로덕션 DB에 적용됨 (코드 정합성 맞춤).

DROP INDEX IF EXISTS "activities_day_id_start_time_idx";

ALTER TABLE "activities"
  ADD COLUMN "start_time_new" TIMESTAMPTZ(3),
  ADD COLUMN "end_time_new" TIMESTAMPTZ(3);

UPDATE "activities" a
SET "start_time_new" = d."date"::date + SUBSTRING(a."start_time" FROM 1 FOR 5)::time
FROM "days" d
WHERE a."day_id" = d."id" AND a."start_time" IS NOT NULL;

UPDATE "activities" a
SET "end_time_new" = d."date"::date + SUBSTRING(a."end_time" FROM 1 FOR 5)::time
FROM "days" d
WHERE a."day_id" = d."id" AND a."end_time" IS NOT NULL;

ALTER TABLE "activities" DROP COLUMN "start_time", DROP COLUMN "end_time";
ALTER TABLE "activities" RENAME COLUMN "start_time_new" TO "start_time";
ALTER TABLE "activities" RENAME COLUMN "end_time_new" TO "end_time";

CREATE INDEX "activities_day_id_start_time_idx" ON "activities"("day_id", "start_time");
