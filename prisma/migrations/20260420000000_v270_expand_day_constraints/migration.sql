-- [migration-type: schema-only]
-- v2.7.0 #296: Day 스키마 재설계 expand 단계
--
-- 변경:
-- 1. trips.start_date / end_date NOT NULL 제약 추가 (감사 결과 NULL 0건)
-- 2. days 테이블에 (trip_id, date) 유니크 제약 추가 (감사 결과 중복 0건)
--
-- dayNumber는 응답 파생 필드이므로 컬럼 추가 없음.
-- 기존 sort_order 컬럼은 v1 호환을 위해 유지 (#317에서 후속 DROP).

ALTER TABLE "trips" ALTER COLUMN "start_date" SET NOT NULL;
ALTER TABLE "trips" ALTER COLUMN "end_date" SET NOT NULL;

CREATE UNIQUE INDEX "days_trip_id_date_key" ON "days"("trip_id", "date");
