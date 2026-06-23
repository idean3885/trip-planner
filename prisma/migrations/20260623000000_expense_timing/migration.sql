-- [migration-type: data-migration]
-- spec 061 (#807) — 지출 시점(사전/현장) 도입.
--
-- Phase A: paymentTiming 추가 + 기존 reservationStatus 에서 사전/현장 보정 백필.
-- reservation_status 컬럼은 보존(휴면) — 가져오기·내보내기·승격 연동 회귀 방지.
-- 컬럼 완전 제거는 후속(Phase B)에서 연동 정리와 함께.
--
-- 비파괴: 신규 컬럼 추가 + UPDATE 백필만. 기존 데이터 보존.

-- expand: enum + 컬럼(NOT NULL default ON_SITE)
CREATE TYPE "PaymentTiming" AS ENUM ('ADVANCE', 'ON_SITE');

ALTER TABLE "activities" ADD COLUMN "payment_timing" "PaymentTiming" NOT NULL DEFAULT 'ON_SITE';

-- backfill: 예약 성격(예약완료/필수/권장)=사전 결제, 현장/불필요=현장 결제
UPDATE "activities"
   SET "payment_timing" = 'ADVANCE'
 WHERE "reservation_status" IN ('RESERVED', 'REQUIRED', 'RECOMMENDED');

-- ON_SITE/NOT_NEEDED/NULL 은 default('ON_SITE') 유지 — 별도 UPDATE 불요.
