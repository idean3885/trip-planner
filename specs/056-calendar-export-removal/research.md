# Research: 외부 캘린더 내보내기 제품 노출 제거

**Feature**: 056-calendar-export-removal | **Date**: 2026-06-04

조사 대상: (1) 제거할 export/sync 표면의 전수, (2) import가 의존하는 인증의 출처, (3) UI 결합도, (4) 기존 테스트 경계. 코드 근거 기반.

## Decision 1: 자동 반영(auto-sync) 호출 제거 위치

- **Decision**: 활동 CRUD·초안 확정 라우트 8곳의 `after(triggerCalendarAutoSync(...))` 호출을 제거한다. `triggerCalendarAutoSync` 함수(`src/lib/calendar/auto-sync.ts`)와 코어 sync 엔진은 보존한다(미호출 상태).
- **Rationale**: 오염의 직접 원인은 활동 변경 시 외부 캘린더 자동 쓰기다. 호출처만 끊으면 신규 오염이 멈추고, 함수 보존으로 재도입 여지를 남긴다(FR-011).
- **호출처(제거 대상)**:
  - `src/app/api/trips/[id]/days/[dayId]/activities/route.ts` (POST)
  - `src/app/api/trips/[id]/days/[dayId]/activities/[activityId]/route.ts` (PUT/PATCH/DELETE)
  - `src/app/api/trips/[id]/days/batch-delete/route.ts` (POST)
  - `src/app/api/trips/[id]/activities/batch-delete/route.ts` (POST)
  - `src/app/api/trips/[id]/drafts/[draftId]/promote/route.ts` (POST)
  - `src/app/api/trips/[id]/drafts/promote-batch/route.ts` (POST)
- **Alternatives considered**: (A) `triggerCalendarAutoSync`를 no-op로 바꾸기 — 호출은 남아 의도가 불명확. (B) 함수까지 삭제 — 코드 보존 전제에 위배. 호출처 제거가 가장 명확.

## Decision 2: import 인증 독립성 (가장 중요)

- **Decision**: import 표면(ImportSection/DraftSection, `/api/.../calendar-import`, `runImport`)을 그대로 유지한다. export 연결(`TripCalendarLink`/`connectCalendar` 산출물) 제거는 import에 영향이 없다.
- **Rationale (코드 근거)**:
  - Google import: `src/lib/calendar-import/google.ts`의 `isConnected(userId)`는 Auth.js 계정의 `access_token`/scope만 확인하고, `listEvents()`는 `getCalendarClient(userId)`로 세션 user OAuth 토큰을 직접 사용한다. `TripCalendarLink` 미참조.
  - Apple import: `src/lib/calendar-import/apple.ts`의 `loadClient(userId)`는 `AppleCalendarCredential`(user-level)만 로드한다. `TripCalendarLink` 미참조.
  - `runImport`(`src/lib/calendar-import/service.ts`)는 권한 체크 후 `fetcher.isConnected(userId)`만 확인하며 `TripCalendarLink` 존재를 전제하지 않는다. 미연결 시 `ExternalAccountNotLinkedError`(Auth.js 계정 인증 상태)로 분기.
- **Alternatives considered**: 없음 — 코드가 이미 분리되어 있어 별도 분리 작업 불필요.

## Decision 3: 캘린더 다이얼로그 가져오기 전용 재구성

- **Decision**: `CalendarSyncDialog`에서 `ProviderSection`(export 연결/해제 UI)을 제품 표면에서 제거하고, ImportSection/DraftSection 렌더 게이트를 export 연결 상태(`calendarLinked`)가 아니라 "외부 캘린더 계정 연결 상태"(`/api/users/me/external-calendars`)로 재정의한다. 가져오기 전용 안내 문구를 추가한다.
- **Rationale**: 현재 ImportSection/DraftSection의 `showImport`/`showDrafts` 게이트가 `calendarLinked` state에 의존하고, 그 state는 ProviderSection의 `onLinkChanged`가 set한다(`CalendarSyncDialog.tsx`). ProviderSection을 제거하면 이 state 공급원이 사라지므로 게이트를 import의 실제 인증 게이트(external-calendars)로 옮긴다. ImportSection 자체는 이미 `/api/users/me/external-calendars`로 AppleCalendarCredential/Auth.js를 직접 확인하므로 정합한다.
- **Alternatives considered**: (A) ProviderSection을 숨기되 state는 유지 — 죽은 상태 관리가 남음. (B) 다이얼로그 전체를 ImportPanel로 교체 — 변경 폭이 커지고 DraftSection 재배선 필요. 게이트만 재정의하는 최소 변경 채택.

## Decision 4: 레거시 컴포넌트 처리

- **Decision**: `GCalLinkPanel.tsx`·`AppleEntryCard.tsx`·`CalendarProviderChoice.tsx`는 현재 활성 렌더 경로가 없는 레거시(v2.16.0 통합 다이얼로그로 대체됨)다. 제품 표면이 아니므로 별도 제거 없이 보존한다(코드 보존 전제). 단 활성 import 경로가 남아 있지 않은지 tasks 단계에서 재확인한다.
- **Rationale**: 이미 미노출이므로 "제품 표면 분리" 목표를 충족한다. 불필요한 삭제는 코드 보존 전제와 변경 폭 최소화에 반한다.

## Decision 5: 공개 엔드포인트 410 Gone 폐지

- **Decision**: 아래 export 계열 엔드포인트를 410 Gone으로 폐지한다. 레거시 `src/app/api/trips/[id]/gcal/sync/route.ts`가 이미 쓰는 410 패턴을 따른다.
  - `POST /api/v2/trips/[id]/calendar/sync`
  - `POST/DELETE/GET /api/v2/trips/[id]/calendar` (connect/disconnect/status)
  - `POST /api/v2/trips/[id]/calendar/apple/connect`
  - `POST/DELETE /api/v2/trips/[id]/calendar/subscribe`
- **Rationale**: 기존 소비자에게 "더 이상 제공되지 않음"을 명확히 전달(FR-007). API 계약 변경(breaking 성격)이라 버전에 반영한다. ImportSection은 `/api/users/me/external-calendars`를 쓰므로 위 GET 폐지의 영향을 받지 않는다.
- **주의**: Apple credential 등록은 user-level `/settings/calendars`(별도 경로)에서 관리되며 import 인증이므로 유지한다. trip별 `apple/connect`(export 전용 캘린더)만 폐지 대상이다.
- **Alternatives considered**: (B) 라우트 파일 삭제(404) — 사용자 선택은 410 Gone. (C) no-op 200 — 호출자가 성공으로 오인. 410 채택(사용자 확정).

## Decision 6: 데이터 모델·마이그레이션

- **Decision**: 마이그레이션 없음. export 추적 모델(`TripCalendarLink`/`TripCalendarEventMapping`/`MemberCalendarSubscription`/`GCalLink`/`GCalEventMapping`)은 보존하되 신규 생성·갱신을 중단한다. 물리적 테이블 정리는 별도 후속.
- **Rationale**: 코드 보존 전제(FR-011). 미사용 테이블 잔존은 기술 부채지만, 정합성 문제 해소 후 재도입 가능성을 위해 1차에서는 보존한다.
- **Alternatives considered**: schema-only DROP 마이그레이션 — 코드 보존 전제와 충돌, 재도입 비용↑. 범위 밖으로 결정.

## Decision 7: 테스트 전략

- **Decision**:
  - `tests/lib/calendar-auto-sync.test.ts`: 제거(호출처가 사라진 함수의 단위 테스트는 죽은 코드 검증).
  - 활동 CRUD·promote 라우트 테스트: 자동 sync mock/assert 제거 + "외부 캘린더 자동 반영 미발생" 회귀 검증으로 전환.
  - import 테스트(`drafts-promote-batch.test.ts`, `DraftSection.test.tsx`, `trip-derived-period.test.ts` import 경로): 유지(회귀 가드).
  - 신규: import 독립 인증 회귀 가드(`TripCalendarLink` 없이 import 동작 / credential 없으면 폐지 응답), export 410 응답 테스트.
- **Rationale**: SC-001(자동 변경 0건)·SC-003(import 회귀 0건)·SC-004(쓰기 실행 0건)를 자동 증거로 고정.

## Decision 8: OpenAPI 공개 스펙 영향 없음

- **Decision**: 공개 OpenAPI 스펙(`src/lib/openapi.ts`)에는 외부 캘린더 쓰기·동기화·연결·구독 표면이 애초에 문서화되어 있지 않다(calendar/import/draft/gcal 키워드 0건). 따라서 OpenAPI에 별도 deprecated/410 표기를 추가하지 않는다.
- **Rationale**: 공개 API 문서는 trips/days/activities CRUD 등 문서화 대상만 노출한다. export 엔드포인트는 내부 UI용으로 공개 계약에 포함된 적이 없어, 폐지(410) 처리만으로 충분하다.

## Open Questions

없음 — spec Clarifications 1~5와 본 research로 모두 봉합.
