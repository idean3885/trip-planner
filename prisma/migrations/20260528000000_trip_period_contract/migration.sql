-- [migration-type: schema-only]
-- spec 029 T050 (#601) v3.0.0 contract — Trip.start_date / end_date 컬럼 제거.
--
-- 배경: v2.17.0 expand 에서 getDerivedPeriod 헬퍼 도입, v2.18.0 migrate 에서
-- 모든 read-path 가 derived 값(min/max(Day.date)) 을 사용하도록 전환. 명목
-- 컬럼은 첫 일정 추가 전 fallback 표시값으로만 의미를 가졌으며 spec FR-002
-- 결정에 따라 사용자에 노출하지 않음. v3.0.0 contract 에서 컬럼 자체 제거.
--
-- 함께 정리되는 코드:
--   - getResolvedPeriod fallback 인자 제거 (DerivedPeriod 반환)
--   - PUT /api/(v2/)trips/[id] body.startDate/endDate 입력 거부
--   - POST /api/trips body.startDate/endDate 입력 거부
--   - expandTripRangeIfNeeded 함수 제거 + days route 가 derived 직접 사용
--   - MCP create_trip/update_trip 시그니처에서 startDate/endDate 파라미터 제거
--   - OpenAPI Trip 스키마 startDate/endDate 노출 제거 (응답 출처는 derived)
--
-- 사전 점검: `tsx scripts/verify-trip-period-contract-readiness.ts` 로 모든
-- trip 의 명목·derived 정합 + 일정 0건 trip 수 확인 후 실행.
--
-- 롤백:
--   ALTER TABLE "trips" ADD COLUMN "start_date" TIMESTAMPTZ(3);
--   ALTER TABLE "trips" ADD COLUMN "end_date"   TIMESTAMPTZ(3);
--   UPDATE "trips" t SET
--     "start_date" = COALESCE((SELECT MIN(d.date) FROM "days" d WHERE d.trip_id = t.id), NOW()),
--     "end_date"   = COALESCE((SELECT MAX(d.date) FROM "days" d WHERE d.trip_id = t.id), NOW());
--   ALTER TABLE "trips" ALTER COLUMN "start_date" SET NOT NULL;
--   ALTER TABLE "trips" ALTER COLUMN "end_date"   SET NOT NULL;

ALTER TABLE "trips" DROP COLUMN "start_date";
ALTER TABLE "trips" DROP COLUMN "end_date";
