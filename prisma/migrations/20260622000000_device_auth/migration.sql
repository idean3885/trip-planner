-- [migration-type: schema-only]
-- spec 060 (#793) — 헤드리스 Device Authorization Grant.
--
-- 신규 테이블 1종(device_authorization_requests) + enum 1종(DeviceAuthStatus).
-- 비파괴: 기존 테이블·컬럼·데이터 변경 없음. 데이터 보정 불요(expand 단독).
--
-- 진행 중 device 인증 요청 상태(승인↔폴링 공유). 승인·만료로 소비되면 삭제한다.
-- rawToken 은 저장하지 않는다(승인 후 폴링 시 PAT 발급·1회 반환).

CREATE TYPE "DeviceAuthStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

CREATE TABLE "device_authorization_requests" (
    "id" TEXT NOT NULL,
    "device_code_hash" TEXT NOT NULL,
    "user_code" TEXT NOT NULL,
    "status" "DeviceAuthStatus" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 5,
    "last_polled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_authorization_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_authorization_requests_device_code_hash_key" ON "device_authorization_requests"("device_code_hash");

CREATE UNIQUE INDEX "device_authorization_requests_user_code_key" ON "device_authorization_requests"("user_code");

CREATE INDEX "device_authorization_requests_expires_at_idx" ON "device_authorization_requests"("expires_at");

ALTER TABLE "device_authorization_requests" ADD CONSTRAINT "device_authorization_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
