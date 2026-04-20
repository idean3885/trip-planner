-- [migration-type: data-migration]
-- v2.7.1 #317: contract 단계 NOOP baseline
--
-- sortOrder 컬럼은 dayNumber와 동일한 파생 값이라 데이터 손실 없이 제거 가능.
-- 따라서 보정 SQL이 필요하지 않으며 본 마이그레이션은 NOOP.
--
-- 비상 복구 시 (이전 코드로 롤백 필요할 경우):
--   ALTER TABLE "days" ADD COLUMN "sort_order" INT NOT NULL DEFAULT 0;
--   UPDATE "days" d
--   SET sort_order = ((d.date::date - t.start_date::date) + 1)
--   FROM "trips" t
--   WHERE d.trip_id = t.id;

SELECT 1;  -- noop
