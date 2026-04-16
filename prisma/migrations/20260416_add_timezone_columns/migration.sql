-- Activity에 IANA timezone 컬럼 추가 (표시 시간대 보존)
-- nullable: 대부분의 활동은 Day 도시 시간대와 동일하므로 생략 가능

ALTER TABLE "activities" ADD COLUMN "start_timezone" VARCHAR(40);
ALTER TABLE "activities" ADD COLUMN "end_timezone" VARCHAR(40);
