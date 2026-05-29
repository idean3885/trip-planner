-- [migration-type: schema-only]
-- spec 035 (#632) — ReservationStatus 에 RESERVED("예약 완료") 추가.
--
-- 배경: 기존 4값(REQUIRED/RECOMMENDED/ON_SITE/NOT_NEEDED)은 "예약 필요성" 축.
-- 온라인 등으로 이미 예약을 마친 일정을 표시할 값이 없어 RESERVED 추가.
--
-- 비파괴: enum 값 추가는 기존 행·기존 값에 영향이 없다. 데이터 보정 불요(expand
-- 단독, contract 없음). 선례: 20260414053446_add_owner_role 의 TripRole ADD VALUE.

ALTER TYPE "ReservationStatus" ADD VALUE 'RESERVED';
