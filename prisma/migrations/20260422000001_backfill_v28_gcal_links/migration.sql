-- [migration-type: data-migration]
-- v2.9.0 backfill — v2.8.0의 per-user GCalLink 중 오너 소유 레코드를 TripCalendarLink로 승격.
-- 같은 트립의 비-오너 GCalLink는 제거 (cascade로 gcal_event_mappings도 제거됨).
-- 멤버 본인 외부 계정에 남은 구글 캘린더 자체는 건드리지 않음 (사용자가 수동 정리 가능).
--
-- 원칙:
--   - DEDICATED 캘린더만 대상 (PRIMARY는 멤버 개인 공간이라 승격 불가)
--   - 트립 오너는 trip_members.role='OWNER'로 식별
--   - 멱등성: 이미 trip_calendar_links가 존재하는 트립은 건너뜀

-- 1) 오너 GCalLink → TripCalendarLink 승격
INSERT INTO "trip_calendar_links" (
    "trip_id",
    "owner_id",
    "calendar_id",
    "calendar_name",
    "last_synced_at",
    "last_error",
    "skipped_count",
    "created_at",
    "updated_at"
)
SELECT
    gl."trip_id",
    gl."user_id" AS "owner_id",
    gl."calendar_id",
    gl."calendar_name",
    gl."last_synced_at",
    gl."last_error",
    gl."skipped_count",
    gl."created_at",
    gl."updated_at"
FROM "gcal_links" gl
INNER JOIN "trip_members" tm
    ON tm."trip_id" = gl."trip_id"
    AND tm."user_id" = gl."user_id"
    AND tm."role" = 'OWNER'
WHERE gl."calendar_type" = 'DEDICATED'
  AND NOT EXISTS (
      SELECT 1 FROM "trip_calendar_links" tcl WHERE tcl."trip_id" = gl."trip_id"
  );

-- 2) 같은 트립의 비-오너 GCalLink 제거 (이벤트 매핑도 cascade)
--    승격된 트립만 대상으로 해서 부분 실패 여파 최소화.
DELETE FROM "gcal_links" gl
USING "trip_calendar_links" tcl
WHERE gl."trip_id" = tcl."trip_id"
  AND gl."user_id" != tcl."owner_id";
