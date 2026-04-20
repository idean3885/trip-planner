-- [migration-type: schema-only]
-- v2.7.1 #317: contract 단계 — Day.sort_order 컬럼 제거
--
-- 배경: v2.7.0(#296)에서 dayNumber를 (date - trip.startDate) + 1로 파생하는
-- 자연키 모델로 전환. sortOrder 컬럼은 v1 호환을 위해 유지됐으나 더 이상
-- 의미 없음. 본 마이그레이션이 expand-and-contract 패턴의 contract 단계.
--
-- v1 어댑터(/api/trips/...)는 응답 시 sortOrder 키를 dayNumber 계산값으로
-- 동적 생성. MCP 클라이언트 호환 100% 유지.
--
-- 롤백: 본 SQL의 역방향 (data-migration baseline 헤더 참조)

ALTER TABLE "days" DROP COLUMN "sort_order";
