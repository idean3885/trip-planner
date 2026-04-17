-- Backfill: trip 생성자를 OWNER로 승격
-- 배경: OWNER enum은 20260414053446에서 추가되었으나 POST /api/trips가 생성자를
-- HOST로 등록해 옴. 결과적으로 어떤 여행에도 OWNER가 없어 DELETE/transfer가 항상 403.
-- 이 마이그레이션은 다음 조건을 모두 만족하는 TripMember를 OWNER로 승격한다 (멱등):
--   1) trip_members.user_id = trips.created_by
--   2) trip_members.role = 'HOST'
--   3) 해당 trip에 아직 OWNER가 없음

UPDATE "trip_members" AS tm
SET "role" = 'OWNER'
FROM "trips" AS t
WHERE tm."trip_id" = t."id"
  AND tm."user_id" = t."created_by"
  AND tm."role" = 'HOST'
  AND NOT EXISTS (
    SELECT 1
    FROM "trip_members" AS tm2
    WHERE tm2."trip_id" = t."id"
      AND tm2."role" = 'OWNER'
  );
