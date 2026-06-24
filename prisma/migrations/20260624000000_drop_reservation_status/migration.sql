-- [migration-type: schema-only]
-- spec 061 (#811) — Phase B: 예약상태(reservation_status) 완전 제거.
--
-- Phase A(20260623000000_expense_timing)에서 paymentTiming 으로 사전/현장 의미를
-- 백필 완료했다. 이제 휴면 컬럼·enum 을 제거한다 — 의미는 payment_timing 으로 이미
-- 이관되어 손실 없음. 가져오기·내보내기·승격 연동도 같은 PR 에서 함께 정리된다.
--
-- 파괴적 DDL(DROP COLUMN/TYPE)이지만 데이터 재해석은 선행 마이그레이션에서 끝났다.

-- contract: 휴면 컬럼 제거
ALTER TABLE "activities" DROP COLUMN "reservation_status";

-- 더 이상 참조 없는 enum 타입 제거
DROP TYPE "ReservationStatus";
