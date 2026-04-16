-- Activity에 IANA timezone 컬럼 추가 (표시 시간대 보존)
-- nullable: 대부분의 활동은 Day 도시 시간대와 동일하므로 생략 가능

ALTER TABLE "activities" ADD COLUMN "start_timezone" VARCHAR(40);
ALTER TABLE "activities" ADD COLUMN "end_timezone" VARCHAR(40);

-- 테이블 코멘트
COMMENT ON TABLE "activities" IS '일정 내 구조화된 활동 (관광, 식사, 이동 등)';
COMMENT ON TABLE "days" IS '여행 일자. Trip에 속하며 Activity를 포함';
COMMENT ON TABLE "trips" IS '여행. 멤버가 공유하는 일정 단위';
COMMENT ON TABLE "trip_members" IS '여행 멤버 (OWNER, HOST, GUEST)';
COMMENT ON TABLE "personal_access_tokens" IS '외부 클라이언트(MCP 등) API 인증용 PAT';

-- 컬럼 코멘트
COMMENT ON COLUMN "activities"."start_time" IS '시작 시각 (UTC). Day.date + 현지 HH:mm으로 생성';
COMMENT ON COLUMN "activities"."start_timezone" IS '시작 표시 시간대 (IANA, e.g. Asia/Seoul). NULL이면 Day 도시 시간대';
COMMENT ON COLUMN "activities"."end_time" IS '종료 시각 (UTC). Day.date + 현지 HH:mm으로 생성';
COMMENT ON COLUMN "activities"."end_timezone" IS '종료 표시 시간대 (IANA, e.g. Europe/Lisbon). NULL이면 start_timezone과 동일';
COMMENT ON COLUMN "activities"."category" IS '활동 유형: SIGHTSEEING, DINING, TRANSPORT, ACCOMMODATION, SHOPPING, OTHER';
COMMENT ON COLUMN "activities"."cost" IS '예상 비용 (currency 통화 기준)';
COMMENT ON COLUMN "activities"."currency" IS 'ISO 4217 통화 코드 (기본 EUR)';
COMMENT ON COLUMN "activities"."reservation_status" IS '예약 상태: REQUIRED, RECOMMENDED, ON_SITE, NOT_NEEDED';
COMMENT ON COLUMN "activities"."sort_order" IS '일자 내 표시 순서 (0부터)';
