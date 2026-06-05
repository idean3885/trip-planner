-- [migration-type: schema-only]
-- spec 058 (#776) — Activity 에 URL 항목 추가.
--
-- 배경: 예약·티켓·문서 링크를 자유 메모와 섞지 않고 별도 항목으로 둔다. 애플
-- 캘린더의 URL 필드 대응. nullable 컬럼 추가만 하며 기존 행은 NULL 로 남아 동작이
-- 바뀌지 않는다(additive expand, backfill 불필요). memo 와 독립이다.

ALTER TABLE "activities" ADD COLUMN "url" TEXT;
