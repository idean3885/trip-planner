-- [migration-type: schema-only]
-- Feature: Google Calendar 연동 (spec 018, #305)
-- 영향: 새 테이블 2개(gcal_links, gcal_event_mappings) + enum 1개(GCalCalendarType) 추가.
--       기존 스키마 불변. 백필 없음.

CREATE TYPE "GCalCalendarType" AS ENUM ('DEDICATED', 'PRIMARY');

CREATE TABLE "gcal_links" (
    "id"             SERIAL PRIMARY KEY,
    "user_id"        TEXT NOT NULL,
    "trip_id"        INTEGER NOT NULL,
    "calendar_id"    TEXT NOT NULL,
    "calendar_type"  "GCalCalendarType" NOT NULL,
    "calendar_name"  TEXT,
    "last_synced_at" TIMESTAMPTZ(3),
    "last_error"     TEXT,
    "skipped_count"  INTEGER NOT NULL DEFAULT 0,
    "created_at"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "gcal_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gcal_links_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "gcal_links_user_id_trip_id_key" ON "gcal_links"("user_id", "trip_id");
CREATE INDEX "gcal_links_trip_id_idx" ON "gcal_links"("trip_id");

CREATE TABLE "gcal_event_mappings" (
    "id"              SERIAL PRIMARY KEY,
    "link_id"         INTEGER NOT NULL,
    "activity_id"     INTEGER NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "synced_etag"     TEXT NOT NULL,
    "last_synced_at"  TIMESTAMPTZ(3) NOT NULL,
    "created_at"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "gcal_event_mappings_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "gcal_links"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gcal_event_mappings_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "gcal_event_mappings_link_id_activity_id_key" ON "gcal_event_mappings"("link_id", "activity_id");
