-- [migration-type: schema-only]
-- spec 025 (#417) — Apple iCloud CalDAV 자격증명 테이블.
-- 1 user 1 row (userId @id). user 삭제 시 cascade로 자동 정리.
-- AES-256-GCM 암호문은 base64(ciphertext + 16바이트 auth tag) 단일 컬럼에 저장.
-- IV는 row마다 12바이트 생성, base64로 보관.

CREATE TABLE "apple_calendar_credentials" (
    "user_id" TEXT NOT NULL,
    "apple_id" TEXT NOT NULL,
    "encrypted_password" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "last_validated_at" TIMESTAMPTZ(3),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "apple_calendar_credentials_pkey" PRIMARY KEY ("user_id")
);

-- foreign key (cascade)
ALTER TABLE "apple_calendar_credentials" ADD CONSTRAINT "apple_calendar_credentials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
