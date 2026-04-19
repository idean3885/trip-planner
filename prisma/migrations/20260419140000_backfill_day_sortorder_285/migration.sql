-- [migration-type: data-migration]
-- #285: DAY 0 UI 버그 데이터 보정
--
-- 원인: Day.sort_order가 @default(0)이고 POST/api/trips/:id/days가 클라이언트
-- 값을 그대로 저장했음. 미지정 시 0으로 고정되어 UI에 "DAY 0"이 노출.
--
-- 보정: 각 Trip의 Day를 (date ASC, id ASC) 순으로 정렬해 sort_order를 1부터
-- 재번호. 이후 신규 채번·재정렬은 API의 resortDaysByDate()에서 수행.
--
-- 구조적 재설계(sortOrder 폐기 or dayNumber 컬럼)는 #296(v2.5)에서 별도 진행.

WITH renumbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY date ASC, id ASC) AS new_order
  FROM days
)
UPDATE days d
SET sort_order = r.new_order
FROM renumbered r
WHERE d.id = r.id;
