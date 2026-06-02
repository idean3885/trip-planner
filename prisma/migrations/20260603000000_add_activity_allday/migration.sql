-- [migration-type: schema-only]
-- spec 054 (#740) — Activity 에 종일(all-day) 플래그 추가.
--
-- 배경: 숙소처럼 시간이 없는/여러 날에 걸친 종일 일정을 시간 활동과 구분해
-- 활동 영역 최상단 별도 섹션으로 분리하기 위한 토대. 기본값 false 이므로 기존
-- 행은 모두 시간 활동으로 동작이 바뀌지 않는다(additive expand, backfill 불필요).

ALTER TABLE "activities" ADD COLUMN "is_all_day" BOOLEAN NOT NULL DEFAULT false;
