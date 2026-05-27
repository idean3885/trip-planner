-- [migration-type: schema-only]
-- spec 027 (#527) — 외부 캘린더 import용 ActivityDraft + ImportRun 테이블.
-- ADR 0006 외부 → 내부 단방향. trip 캘린더 정본(ADR 0003)은 변경 없음.
-- 매핑 가능 필드는 채워서 받고, 매핑 불가 필드는 사용자가 승격 단계에서 입력.
-- 멱등성: (provider, external_calendar_id, external_event_id) 3-tuple 유니크.

-- 1) enum: ActivityDraftStatus
CREATE TYPE "ActivityDraftStatus" AS ENUM ('PENDING', 'PROMOTED', 'DELETED');

-- 2) ImportRun — import 1회 실행 메타. ActivityDraft가 FK로 참조하므로 먼저 생성.
CREATE TABLE "import_runs" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "triggered_by_user_id" TEXT NOT NULL,
    "provider" "CalendarProviderId" NOT NULL,
    "external_calendar_id" TEXT NOT NULL,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_titles" TEXT[],
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_runs_trip_id_started_at_idx" ON "import_runs"("trip_id", "started_at");

ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_trip_id_fkey"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_triggered_by_user_id_fkey"
    FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 3) ActivityDraft — 외부 이벤트에서 만들어진 일정 초안.
CREATE TABLE "activity_drafts" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "day_id" INTEGER,
    "provider" "CalendarProviderId" NOT NULL,
    "external_calendar_id" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ(3) NOT NULL,
    "end_time" TIMESTAMPTZ(3) NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "location_text" TEXT,
    "description" TEXT,
    "start_timezone" VARCHAR(40),
    "end_timezone" VARCHAR(40),
    "status" "ActivityDraftStatus" NOT NULL DEFAULT 'PENDING',
    "promoted_to_activity_id" INTEGER,
    "import_run_id" INTEGER NOT NULL,
    "last_refreshed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "activity_drafts_promoted_to_activity_id_key" ON "activity_drafts"("promoted_to_activity_id");
CREATE UNIQUE INDEX "activity_drafts_provider_external_calendar_id_external_event_id_key"
    ON "activity_drafts"("provider", "external_calendar_id", "external_event_id");
CREATE INDEX "activity_drafts_trip_id_status_idx" ON "activity_drafts"("trip_id", "status");

ALTER TABLE "activity_drafts" ADD CONSTRAINT "activity_drafts_trip_id_fkey"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_drafts" ADD CONSTRAINT "activity_drafts_day_id_fkey"
    FOREIGN KEY ("day_id") REFERENCES "days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_drafts" ADD CONSTRAINT "activity_drafts_promoted_to_activity_id_fkey"
    FOREIGN KEY ("promoted_to_activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_drafts" ADD CONSTRAINT "activity_drafts_import_run_id_fkey"
    FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
