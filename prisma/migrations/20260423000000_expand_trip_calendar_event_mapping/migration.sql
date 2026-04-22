-- [migration-type: data-migration]
-- spec 022 v2.10.0 expand 매핑 단계 — 이벤트 매핑을 공유 캘린더(`trip_calendar_links`)에
-- 직접 귀속하는 `trip_calendar_event_mappings` 테이블을 신설하고 기존 데이터 복사.
-- 구 테이블(`gcal_event_mappings`·`gcal_links`)은 **남긴다**. 드롭은 후속 릴리즈(v2.11.0+)
-- 에서 "완전 contract" 단계로 분리 — 배포 플랫폼의 구·신 인스턴스 병존 과도 구간에서
-- 구 인스턴스가 구 테이블을 참조할 때 500이 나지 않도록 하기 위함.
--
-- 복사 조인 조건: bridge 로직(v2.9.0 이래)이 `calendar_id + trip_id` 일치 기준으로
-- 매핑을 GCalLink에 귀속해 왔으므로 1:1 결정적.
--
-- 무손실 검증(수동):
--   SELECT (SELECT COUNT(*) FROM gcal_event_mappings) = (SELECT COUNT(*) FROM trip_calendar_event_mappings);

-- 1) 신규 테이블 생성
CREATE TABLE "trip_calendar_event_mappings" (
    "id" SERIAL PRIMARY KEY,
    "trip_calendar_link_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "synced_etag" TEXT NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_calendar_event_mappings_link_fkey"
        FOREIGN KEY ("trip_calendar_link_id")
        REFERENCES "trip_calendar_links"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trip_calendar_event_mappings_activity_fkey"
        FOREIGN KEY ("activity_id")
        REFERENCES "activities"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "trip_calendar_event_mappings_link_activity_key"
    ON "trip_calendar_event_mappings"("trip_calendar_link_id", "activity_id");
CREATE INDEX "trip_calendar_event_mappings_link_idx"
    ON "trip_calendar_event_mappings"("trip_calendar_link_id");

-- 2) 기존 매핑 데이터 복사. bridgeLink(`gcal_links`)의 `calendar_id`·`trip_id`가
--    해당 여행의 `trip_calendar_links` 레코드와 일치하는 것만 대상.
INSERT INTO "trip_calendar_event_mappings" (
    "trip_calendar_link_id",
    "activity_id",
    "google_event_id",
    "synced_etag",
    "last_synced_at",
    "created_at",
    "updated_at"
)
SELECT
    tcl."id",
    gem."activity_id",
    gem."google_event_id",
    gem."synced_etag",
    gem."last_synced_at",
    gem."created_at",
    gem."updated_at"
FROM "gcal_event_mappings" gem
INNER JOIN "gcal_links" gl ON gem."link_id" = gl."id"
INNER JOIN "trip_calendar_links" tcl
    ON tcl."calendar_id" = gl."calendar_id"
    AND tcl."trip_id" = gl."trip_id"
ON CONFLICT ("trip_calendar_link_id", "activity_id") DO NOTHING;
