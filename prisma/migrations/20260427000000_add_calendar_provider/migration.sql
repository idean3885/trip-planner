-- [migration-type: schema-only]
-- spec 024 (#416): provider 추상화 expand
--
-- 두 캘린더 link 테이블에 provider 컬럼 추가. 기본값 GOOGLE로 채워져
-- 기존 row는 백필 없이 v2.10.x 동작 그대로 유지된다(expand-and-contract).
-- calendarId는 unique 제약 안 추가 (FR-010: 같은 외부 캘린더가 여러 여행에 공유 가능).

-- CreateEnum
CREATE TYPE "CalendarProviderId" AS ENUM ('GOOGLE', 'APPLE');

-- AlterTable
ALTER TABLE "trip_calendar_links"
  ADD COLUMN "provider" "CalendarProviderId" NOT NULL DEFAULT 'GOOGLE';

-- AlterTable
ALTER TABLE "gcal_links"
  ADD COLUMN "provider" "CalendarProviderId" NOT NULL DEFAULT 'GOOGLE';
