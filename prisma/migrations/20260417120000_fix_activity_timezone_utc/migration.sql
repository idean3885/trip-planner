-- [migration-type: data-migration]
--
-- Activity.start_time / end_time: floating-time → 실제 UTC.
--
-- 배경 (#232):
--   과거 API는 HH:mm 입력을 `setUTCHours`로 저장해 "로컬 벽시각을 UTC로 가정"
--   하여 기록했다. 예를 들어 Asia/Seoul 13:00 활동이 `2026-06-07T13:00:00Z`로
--   저장되었다. 실제로는 `2026-06-07T04:00:00Z`(UTC)가 되어야 맞다. 이 값은
--   Timestamptz이면서도 사실상 "floating-time"이다.
--
-- 적용 방식:
--   기존 값이 "UTC로 가정된 로컬 벽시각"이라는 전제로, timezone 컬럼 값을
--   사용해 실제 UTC로 재계산한다.
--
--   Postgres 의미:
--     (x AT TIME ZONE 'UTC')           → timestamp without time zone (벽시각으로 재해석)
--     (… AT TIME ZONE start_timezone)  → 해당 벽시각을 `start_timezone`의 로컬로 보고 UTC로 재변환
--
--   start_timezone/end_timezone이 NULL인 행은 "의도한 표시 시간대를 알 수 없는
--   행"이므로 그대로 둔다 (어떤 값으로 해석해야 할지 복원 불가).
--
-- 멱등성 주의:
--   이 UPDATE는 재실행 시 이중 변환된다. Prisma 마이그레이션 러너는 한 번만
--   적용하므로 정상 경로에서는 안전하지만, 수동 재적용은 금지한다. 롤백 SQL은
--   PR 본문에 기재.
--
-- 롤백 (수동, 필요 시):
--   UPDATE activities SET start_time = (start_time AT TIME ZONE start_timezone) AT TIME ZONE 'UTC'
--     WHERE start_timezone IS NOT NULL AND start_time IS NOT NULL;
--   UPDATE activities SET end_time   = (end_time   AT TIME ZONE end_timezone)   AT TIME ZONE 'UTC'
--     WHERE end_timezone IS NOT NULL AND end_time IS NOT NULL;

UPDATE "activities"
SET "start_time" = ("start_time" AT TIME ZONE 'UTC') AT TIME ZONE "start_timezone"
WHERE "start_timezone" IS NOT NULL
  AND "start_time" IS NOT NULL;

UPDATE "activities"
SET "end_time" = ("end_time" AT TIME ZONE 'UTC') AT TIME ZONE "end_timezone"
WHERE "end_timezone" IS NOT NULL
  AND "end_time" IS NOT NULL;
