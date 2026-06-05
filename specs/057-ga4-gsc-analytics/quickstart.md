# Quickstart: 사용자 분석(GA4)·검색 노출(GSC) + 카피 간소화

**Feature**: `057-ga4-gsc-analytics` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

각 User Story의 회귀 케이스와 실행 증거. PR 게이트가 `validate-quickstart-ev.sh`로 검증(phase=contract → 차단).

## US1 — 가져오기 화면 카피 간소화

### Scenario US1-1: 코드명·기술 설명 제거

가져오기 다이얼로그에 프로젝트 코드명이 없고, "쓰지 않음/정본" 안내 박스가 사라지고, 제목 + 한 줄 설명만 남는다.

### Evidence

- 자동 테스트: `tests/components/calendar-sync/CalendarSyncDialog.test.tsx` — 코드명 문자열 부재 + 안내 박스 미렌더 + 제목/설명 존재 검증
- 자동 테스트: `tests/components/calendar-sync/import-section-copy.test.tsx` — 빈 상태 안내에 코드명 부재
- 수동 체크리스트:
  - [ ] 실제 화면에서 가져오기 다이얼로그에 코드명·안내 박스 없음(실기기·dev 확인)
- 스크린샷: `docs/evidence/057-ga4-gsc-analytics/us1-import-dialog-*.png`

## US2 — 사용 행태 분석(GA4)

### Scenario US2-1: 측정 ID 설정 시 수집, 미설정 시 비활성

측정 ID가 있으면 페이지뷰·전환 이벤트가 수집되고, 없으면 분석 태그가 붙지 않고 앱이 정상 동작한다.

### Scenario US2-2: 핵심 전환 이벤트 + 익명 User-ID

여행 생성·가져오기 실행 시 전환 이벤트가 전송되고, 로그인 사용자는 내부 식별자로 연결된다(PII 미전송).

### Evidence

- 자동 테스트: `tests/lib/analytics.test.ts` — 측정 ID 미설정 시 `track()`/`setAnalyticsUser()` no-op(태그 0개와 동치), 설정 시 전송 호출; `user_id`에 PII 미포함 검증
- 수동 체크리스트:
  - [ ] 측정 ID 설정 후 실시간 보고서에 페이지뷰·`trip_created`·`calendar_import` 집계(콘솔 확인)
- 스크린샷: 해당없음(외부 콘솔)

## US3 — 검색 노출 최소

### Scenario US3-1: 공개 페이지만 sitemap, 앱 본체 noindex

sitemap에 공개 페이지만 있고, robots가 앱 경로를 disallow하며, 인증 영역은 noindex다. 소유 확인값은 설정 시 적용.

### Evidence

- 자동 테스트: `tests/app/robots-sitemap.test.ts` — sitemap에 공개 경로만 포함·앱 경로 부재, robots disallow 목록, 소유 확인값 env 가드 검증
- 수동 체크리스트:
  - [ ] 배포 후 `/robots.txt`·`/sitemap.xml` 응답 확인, GSC 소유 확인(콘솔)
- 스크린샷: 해당없음

## 공통 — ADR·가이드

### Scenario DOC-1: 도구 선택 근거·운영 가이드 기록

분석·검색 노출 도구 선택 ADR과 측정 ID·GSC·env 등록 가이드가 존재한다.

### Evidence

- 자동 테스트: 해당없음(문서)
- 수동 체크리스트:
  - [x] ADR(`docs/adr/`) + 운영 가이드 작성 — 구현 단계에서 생성·확인
