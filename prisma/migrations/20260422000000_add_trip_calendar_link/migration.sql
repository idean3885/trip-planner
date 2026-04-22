-- [migration-type: schema-only]
-- v2.9.0 expand — per-trip 공유 캘린더 모델 추가 (#349, spec 019).
-- 레거시 gcal_links / gcal_event_mappings는 병존. 후속 릴리즈에서 contract.

CREATE TYPE "MemberCalendarSubscriptionStatus" AS ENUM ('NOT_ADDED', 'ADDED', 'ERROR');

CREATE TABLE "trip_calendar_links" (
    "id"             SERIAL PRIMARY KEY,
    "trip_id"        INTEGER NOT NULL,
    "owner_id"       TEXT NOT NULL,
    "calendar_id"    TEXT NOT NULL,
    "calendar_name"  TEXT,
    "last_synced_at" TIMESTAMPTZ(3),
    "last_error"     TEXT,
    "skipped_count"  INTEGER NOT NULL DEFAULT 0,
    "created_at"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_calendar_links_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trip_calendar_links_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "trip_calendar_links_trip_id_key" ON "trip_calendar_links"("trip_id");
CREATE INDEX "trip_calendar_links_owner_id_idx" ON "trip_calendar_links"("owner_id");

CREATE TABLE "member_calendar_subscriptions" (
    "id"         SERIAL PRIMARY KEY,
    "link_id"    INTEGER NOT NULL,
    "user_id"    TEXT NOT NULL,
    "status"     "MemberCalendarSubscriptionStatus" NOT NULL DEFAULT 'NOT_ADDED',
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "member_calendar_subscriptions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "trip_calendar_links"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "member_calendar_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "member_calendar_subscriptions_link_id_user_id_key" ON "member_calendar_subscriptions"("link_id", "user_id");
CREATE INDEX "member_calendar_subscriptions_user_id_idx" ON "member_calendar_subscriptions"("user_id");
