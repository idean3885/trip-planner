-- [migration-type: schema-only]
-- spec 062 — 원화 자동 근사 환산 캐시.
--
-- 자동 확보한 일자·통화별 원화 근사 시세를 재사용하기 위한 캐시 테이블.
-- 표시 보조 데이터이며 활동·금액 정본과 무관. 백필 없음(빈 테이블 신설).

CREATE TABLE "exchange_rates" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "base" VARCHAR(3) NOT NULL,
    "rate_to_krw" DECIMAL(18,6) NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- (일자, 통화)당 한 줄 — 캐시 upsert 키
CREATE UNIQUE INDEX "exchange_rates_date_base_key" ON "exchange_rates"("date", "base");
