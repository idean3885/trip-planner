-- [migration-type: data-migration]
-- v2.7.0 #296: 감사 베이스라인 (보정 불필요 확인)
--
-- 사전 감사(2026-04-20 scripts/audit/day-schema.ts) 결과:
--   * trips.start_date/end_date NULL: 0건
--   * (trip_id, date) 중복 Day: 0건
--   * Trip 범위 밖 Day: 0건
--
-- 위 결과로 expand(20260420000000) NOT NULL/UNIQUE 적용이 안전함을 확인.
-- 보정 SQL이 필요하지 않으므로 본 마이그레이션은 NOOP — 그러나 프로세스상
-- "schema-expand" Coverage Target에 짝이 되는 data-migration 산출물로 남긴다.
-- 향후 데이터가 더 쌓인 환경에 동일 expand를 다시 적용할 때, 본 파일을
-- 보정 SQL로 채워 재사용한다.

SELECT 1;  -- noop
