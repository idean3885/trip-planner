# Feature Specification: Apple iCloud CalDAV Provider

**Feature Branch**: `025-apple-caldav-provider`
**Created**: 2026-04-27
**Status**: Draft
**Input**: 두 번째 캘린더 provider로 Apple iCloud CalDAV를 정식 도입한다. 선행 #416의 `CalendarProvider` 추상화 위에 `appleProvider` 구현체를 얹어, Apple 사용자가 Google 사용자와 동일 흐름(공유 캘린더 연결·sync·subscribe)을 경험할 수 있게 한다. POC [#345](../../docs/research/apple-caldav-poc.md)의 측정 결과 + 의사결정 5건 + 추가 발견 3건을 그대로 구현한다. Closes #417.

## Background

POC #345로 Apple iCloud CalDAV 연동의 핵심 동작이 실측 검증됐다(MKCALENDAR 작동, ETag strict, 401 즉시 반환, 응답 시간 <2s). Apple은 OAuth 미제공이라 **app-specific password + Basic Auth**만 가능하며, 사용자가 appleid.apple.com에서 16자리 암호를 직접 발급받아 입력하는 위자드 UX가 필요하다. 본 피처는 POC가 결정한 흐름을 정식 피처로 구현하되, **코드 이식 금지** 원칙(메모리 [feedback_poc_workflow])에 따라 develop 최신 기준으로 새로 작성한다(`spike/apple-caldav` 디렉토리는 reference only).

선행 #416의 `CalendarProvider` 인터페이스가 이미 `GOOGLE`/`APPLE` 두 식별자를 enum에 두고 `getProvider("APPLE")`이 throw하도록 stub 처리되어 있다. 본 피처는 그 stub을 실구현으로 교체하고, capability·에러 vocabulary·retain 판정을 Apple 케이스에 맞춰 채운다.

## Clarifications *(POC #345 의사결정 5건의 spec화)*

1. **자동 캘린더 생성을 1순위, "기존 선택"은 고급 옵션** — POC 측정 #3에서 MKCALENDAR가 201 Created로 작동 확인. 사용자에겐 기본 액션 "trip-planner 전용 캘린더 자동 생성"만 노출하고, MKCALENDAR 실패 시에만 "기존 캘린더에 추가" 보조 옵션이 나타난다. VEVENT 컴포넌트가 없는 캘린더(미리 알림 등)는 목록에서 자동 제외(POC 추가 발견 B).

2. **인증 정보 암호화는 단일 대칭키 (AES-256-GCM)** — 배포 환경 변수에 `APPLE_PASSWORD_ENCRYPTION_KEY`(32바이트 base64) 단 하나를 두고 표준 라이브러리로 password 컬럼을 암호화한다. IV는 row마다 12바이트 생성·저장. 키 회전 시 전체 재암호화 필요(1인 운영·수십 명 규모에서 수동 회전 가능). 사용자 1000명 규모 도달 시 envelope encryption 도입 검토. 근거: POC 의사결정 #4 + ADR-0002(라이브러리 우선/비용 최소).

3. **에러 알림 채널은 401 즉시 UI 배너 + 그 외 일시 오류 무음** — POC 측정 #8에서 401이 즉시 반환됨 확인. 401은 사용자가 폐기·재발급한 경우 또는 Apple ID 비밀번호 변경(#10) 후 일괄 무효화된 경우. 두 케이스 모두 사용자 액션 필요 → 즉시 UI 배너로 안내 + 재인증 링크. 그 외 일시 오류(네트워크·5xx·rate limit)는 무음 처리하고 다음 sync에서 자동 재시도. Google과 동일 톤 유지.

4. **412 Precondition Failed → 외부 직접 수정 감지 후 skip** — POC 측정 #7에서 옛 ETag로 DELETE 시 412 확인. 412 발생 시 해당 이벤트를 GET하여 새 ETag 확보 + 컨텐츠 비교 → 사용자가 외부에서 직접 수정한 것이면 skip(덮어쓰지 않음, skipped 카운트 증가), 컨텐츠가 우리 의도와 동일하면 ETag만 갱신 후 통과. Google sync.ts와 동일한 411 처리 패턴.

5. **위자드 UX는 가이드 문서 Step 1~7을 그대로 구현** — `docs/research/apple-caldav-app-password-guide.md`의 Step 1~7을 위자드 UI로 구현. Step 4·5·6은 POC가 캡쳐한 3장 그대로 사용. Step 7(앱에서 입력)은 위자드 UI 캡쳐를 본 피처 구현 후 추가. 30초 스크린캐스트는 위자드 도움말 영역에 임베드(별도 동영상 호스팅 — 추후 결정).

6. **멤버 ACL은 manual capability** — Apple iCloud는 캘린더별 외부 멤버 초대 API가 없다. 캘린더 공유는 macOS/iOS Calendar 앱에서 사용자가 직접 처리해야 한다. 따라서 `appleProvider.capabilities.autoMemberAcl = "manual"`로 두고, 라우트 계층에서 capability를 읽어 멤버 ACL 자동 부여를 skip하면서 UI에 "Apple Calendar 앱에서 [멤버 이메일]을 직접 초대해 주세요" 안내 배너를 노출한다. **본 피처에선 backend 분기까지 포함, 프런트 UI 안내 배너는 후속 회차로 분리** — 안내 텍스트만 응답 body에 포함하고 UI 컴포넌트 변경은 비범위.

7. **provider 변경 흐름은 후속 회차** — 한 여행에서 Google ↔ Apple 갈아타기는 본 피처 비범위. 사용자가 직접 "기존 연결 해제 → 새 연결" 두 단계로 처리해야 함. 단일 트랜잭션 변경 흐름 UI는 별도 후속.

8. **본 피처는 Google 사용자에게 영향 0** — Apple provider 추가는 link.provider == "GOOGLE" 흐름의 동작·응답·UI에 한 줄도 변화시키지 않는다. 회귀 0 검증이 머지 게이트.

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그를 통해 후속 자동 검증과 연결된다:

- `[artifact: <path>|<path>::<symbol>]` — 산출 파일 식별자(drift 감사 기준)
- `[why: <short-tag>]` — 추적 그룹 키(plan↔tasks 커버리지·이슈 합산)
- `[multi-step: N]` — plan bullet이 다단 작업일 때 최소 매핑 태스크 수(N ≥ 2)
- `[migration-type: schema-only | data-migration]` — 마이그레이션 산출물 구분

본 피처의 마이그레이션은 `schema-only`(`AppleCalendarCredential` 신규 테이블 + `TripCalendarEventMapping.etag` 컬럼 추가, 기본값 빈 문자열)이며 `data-migration`은 없다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Apple 사용자가 첫 연결 위자드를 통해 공유 캘린더 생성 (Priority: P1) 🎯 MVP

Apple ID + 2FA를 갖춘 사용자가 trip-planner 웹에서 "Apple Calendar 연동" 버튼을 누르면, 위자드가 단계별로 안내해 16자리 앱 암호를 입력받고 자동으로 trip-planner 전용 캘린더를 iCloud에 생성한다. 첫 연결 후 사용자의 모든 trip 활동이 iCloud 캘린더에 sync되어 iPhone/iPad/Mac Calendar 앱에서 즉시 표시된다.

**Why this priority**: Apple 도입의 핵심 경험. 본 시나리오가 동작해야 비로소 두 번째 provider로서의 가치가 생긴다.

**Independent Test**: 새 사용자가 위자드 시작 → 가이드 따라 앱 암호 발급 → 입력 → 캘린더 자동 생성 → 첫 sync까지 약 90초 이내 완료, 그 결과물(Apple Calendar의 이벤트)이 iPhone Calendar 앱에 표시.

**Acceptance Scenarios**:

1. **Given** Apple ID + 2FA 활성화 사용자, **When** "Apple Calendar 연동" 버튼 → 위자드 Step 1~3 안내 → 발급한 16자리 암호 입력 → 검증 통과, **Then** MKCALENDAR로 "trip-planner" 캘린더가 iCloud에 자동 생성되고 그 캘린더가 사용자의 Apple Calendar 앱(iPhone)에서 즉시 보인다.
2. **Given** 새 연결 직후, **When** 사용자가 trip 1개의 sync를 트리거, **Then** 모든 활동이 VEVENT로 iCloud에 PUT되고 사용자의 iPhone Calendar 앱에서 시간대·제목·위치가 정확히 표시된다.
3. **Given** 잘못된 16자리 암호를 입력, **When** 위자드가 검증 호출, **Then** 401 응답이 즉시 반환되고 위자드는 "암호가 잘못되었습니다 — 폐기·재발급 후 다시 시도" 안내와 appleid.apple.com 링크를 노출한다.
4. **Given** MKCALENDAR가 드물게 실패, **When** 자동 생성 시도, **Then** 위자드는 "기존 캘린더에 추가" 보조 옵션을 노출하고 사용자가 VEVENT 컴포넌트 보유 캘린더 목록에서 선택한다.

---

### User Story 2 — 인증 만료 시 즉시 재인증 안내 (Priority: P2)

Apple ID 비밀번호를 사용자가 변경하면 발급된 모든 앱 암호가 일괄 무효화된다(POC 측정 #10). 다음 sync 시 401이 발생하면 사용자에게 즉시 UI 배너로 "Apple 앱 암호가 더 이상 유효하지 않습니다 — 폐기·재발급 후 재입력" 안내를 표시한다.

**Why this priority**: Apple 사용자가 인증 만료를 인지하지 못하면 이후 trip 변경이 iCloud에 반영되지 않아 silent failure가 발생한다. 즉시 안내가 필수.

**Independent Test**: 의도적으로 무효한 16자리 암호를 DB에 저장한 상태에서 sync 트리거 → 401 분류 → UI 배너 노출 + 재인증 링크.

**Acceptance Scenarios**:

1. **Given** 무효한 앱 암호를 가진 link, **When** sync 트리거, **Then** 응답에 `error.code = "auth_invalid"` (CalendarProvider vocabulary 매핑) + UI 배너로 "Apple 앱 암호가 더 이상 유효하지 않습니다" 안내가 노출된다.
2. **Given** 위 배너 노출 상태, **When** 사용자가 "재인증" 링크 클릭, **Then** 동일 위자드(US1)가 시작되고 새 앱 암호 입력 시 link 갱신만으로 정상 복구된다(캘린더 재생성 안 함).
3. **Given** 401이 아닌 일시 오류(rate limit, 네트워크), **When** sync 트리거, **Then** 사용자 가시 알림 없이 lastError 컬럼만 갱신되고 다음 sync에서 자동 재시도한다(Google과 동일 톤).

---

### User Story 3 — VTODO 캘린더 자동 필터 + manual ACL 안내 (Priority: P3)

사용자의 iCloud 계정에 "미리 알림"(VTODO) 캘린더가 섞여 있을 때, "기존 캘린더에 추가" 옵션의 목록에서 VEVENT 미보유 캘린더는 자동 제외된다. 또한 멤버를 가진 trip에서 Apple 캘린더를 연결할 때, 시스템이 자동 ACL 부여를 시도하지 않고 사용자에게 "Apple Calendar 앱에서 멤버를 직접 초대해 주세요" 안내를 응답에 포함한다.

**Why this priority**: 두 발견(POC 추가 발견 B + 의사결정 #6)이 사용자 경험에 직접 영향. VTODO 노출은 혼동 유발, manual ACL 미안내는 멤버가 캘린더를 못 보는 silent failure.

**Independent Test**: VTODO 캘린더를 가진 계정으로 "기존 선택" 목록 조회 → VTODO 부재 확인. 멤버 2명 trip에서 Apple 연결 → 응답 body에 안내 텍스트 포함 + 멤버 ACL 부여 호출 0회.

**Acceptance Scenarios**:

1. **Given** iCloud 계정에 VEVENT 캘린더 5개 + VTODO 캘린더 1개, **When** "기존 캘린더에 추가" 옵션 노출, **Then** VEVENT 5개만 목록에 보이고 VTODO 캘린더는 보이지 않는다.
2. **Given** 멤버 2명 trip의 주인이 Apple 연결 완료, **When** connect 응답을 받음, **Then** 응답 body의 `members` 배열은 빈 상태(자동 부여 시도 0)이고 응답에 `manualAclGuidance: "Apple Calendar 앱에서 [멤버 이메일들]을 캘린더 공유로 직접 초대해 주세요"`(또는 동등 키) 텍스트가 포함된다.
3. **Given** Apple link 연결된 trip에서 멤버 가입·역할 변경·탈퇴, **When** member-sync 훅 호출, **Then** `provider.capabilities.autoMemberAcl !== "auto"`로 분기 → 외부 호출 0회, 안내 텍스트만 로그에 기록.

---

## Functional Requirements *(mandatory)*

### FR-001 — appleProvider 구현체 등록
`getProvider("APPLE")`이 throw 대신 `appleProvider` 객체를 반환한다. 객체는 `CalendarProvider` 인터페이스의 모든 메서드를 만족한다.

### FR-002 — 인증·자격증명 저장
사용자가 위자드로 입력한 Apple ID + 16자리 앱 암호를 AES-256-GCM(env 키 + per-row IV)으로 암호화해 신규 테이블 `apple_calendar_credentials`에 저장한다. 1 user → 1 credential row(다중 Apple ID 비범위).

### FR-003 — 위자드 검증
사용자 입력 직후 PROPFIND로 calendar-home-set을 조회해 401 즉시 검출. 응답 시간 <2s 목표(POC 측정 #1).

### FR-004 — MKCALENDAR 자동 생성
연결 시 "trip-planner" 라벨로 신규 캘린더 자동 생성. 응답 URL을 `TripCalendarLink.calendarId`로 저장. list 반영 지연(POC 추가 발견 C)을 우회하기 위해 생성 응답의 URL을 직접 사용.

### FR-005 — 기존 캘린더 선택 폴백
MKCALENDAR 실패 시 fetchCalendars 결과에서 VEVENT 컴포넌트 보유 캘린더만 목록 노출. UI는 후속 — 본 회차는 응답 body에 후보 목록만 포함.

### FR-006 — VEVENT PUT (create/update)
trip 활동을 ICS VEVENT로 변환해 PUT. 응답 ETag를 `TripCalendarEventMapping.etag` 컬럼에 저장(per-event 행).

### FR-007 — VEVENT DELETE
활동 삭제 시 If-Match 헤더로 마지막 ETag를 사용. 412 발생 시 GET으로 최신 ETag 재확보 + 컨텐츠 비교 후 사용자 수정으로 판정되면 skipped(Google sync.ts와 동일 패턴).

### FR-008 — 에러 분류 vocabulary 매핑
`appleProvider.classifyError`가 다음 매핑을 수행:
- 401 → `auth_invalid`
- 412 → `precondition_failed`
- 429 (rate limit) · 5xx · 네트워크 · timeout → `transient_failure`
- 그 외 → `null`

`unregistered_user`/`already_linked`/`revoked`는 Apple에 해당 없음 → 항상 null.

### FR-009 — capability 노출
`appleProvider.capabilities`:
- `autoMemberAcl: "manual"`
- `supportsCalendarCreation: true`
- `supportsCalendarSelection: true`

### FR-010 — VTODO 캘린더 필터
`appleProvider.listCalendars`는 fetchCalendars 응답에서 `components`에 `VEVENT`가 없는 항목을 제외한다.

### FR-011 — manual ACL 안내
connect 응답에 멤버가 있고 capability `manual`이면 응답 body에 안내 텍스트 포함. UI 배너는 후속 회차.

### FR-012 — 401 즉시 UI 배너
sync 응답이 `auth_invalid`면 라우트가 응답 body에 안내 + 재인증 URL(위자드 진입 경로)을 포함.

### FR-013 — Google 사용자 회귀 0
`link.provider == "GOOGLE"` 흐름은 본 피처로 한 줄도 변경되지 않는다. 회귀 테스트로 검증.

## Success Criteria *(mandatory)*

### SC-001 — Apple 첫 연결 + 첫 sync 90초 이내
새 사용자가 위자드 시작 → 가이드 따라 앱 암호 발급 → 입력 → 캘린더 생성 → 첫 sync까지 90초 이내(가이드 읽기 시간 제외, dev 환경 측정).

### SC-002 — 401 안내 응답 시간 <3s
무효한 암호로 sync 트리거 시 401 검출 + UI 배너 노출까지 3초 이내.

### SC-003 — Google 회귀 0
`link.provider == "GOOGLE"` trip 5건의 connect/sync/subscribe 응답이 본 피처 머지 직전 스냅샷과 schema-equivalent.

### SC-004 — 멤버 ACL 자동 호출 0회
Apple link trip의 멤버 가입·역할 변경·탈퇴 훅에서 `appleProvider.upsertMemberAcl`/`revokeMemberAcl` 호출이 0회 발생(capability 분기 검증).

### SC-005 — VTODO 노출 0건
"기존 선택" 응답에 VTODO 컴포넌트 캘린더가 1건도 포함되지 않음(POC 측정 환경 재현 테스트).

### SC-006 — 비밀번호 평문 미노출
앱 암호는 암호화 컬럼에만 저장. log·error trace·응답 body 어디에도 평문 노출 0건. 검증: 로그 grep + 단위 테스트 + dev 환경 dump.

### SC-007 — ETag 보관 정확도
같은 이벤트 5회 update 사이클(create→update×4→delete) 후 모든 단계에서 마지막 ETag만 보관, 전 단계 ETag로 호출 시 412 확인.

## Key Entities *(mandatory)*

- **AppleCalendarCredential** (신규 테이블) — userId(FK User, @id) · appleId · encryptedPassword · iv · createdAt · updatedAt · lastValidatedAt · lastError. 1 user 1 row.
- **TripCalendarLink** (기존, 신규 컬럼 없음) — provider 컬럼은 #416에서 추가됨. Apple link는 `provider == "APPLE"` + calendarId가 CalDAV 캘린더 URL.
- **TripCalendarEventMapping** (기존, `etag` 컬럼 추가) — Google은 syncedEtag 사용 중. Apple은 같은 컬럼 재사용.

## Dependencies & Assumptions

### Dependencies
- 선행 #416 머지 완료 (PR #430): `CalendarProvider` 인터페이스, `getProvider` registry, link.provider 컬럼.
- 외부 라이브러리 `tsdav` 2.x 신규 의존성 추가 (POC 검증, ADR-0002 라이브러리 우선).
- env 추가: `APPLE_PASSWORD_ENCRYPTION_KEY` (32바이트 base64). dev/preview/production 모두 별도 키.

### Assumptions
- Apple iCloud CalDAV의 MKCALENDAR·PUT·DELETE 동작은 POC 측정 결과대로 운영 환경에서도 안정적으로 작동한다(미공식 동작이지만 2026-04 기준 안정).
- 사용자는 2FA를 활성화한 Apple ID 보유(앱 암호 발급 전제).
- 사용자가 가이드를 따라 16자리 암호를 정확히 입력. 입력 검증은 위자드의 책임이고 Apple은 401만 반환.

### Out of Scope
- 다른 CalDAV 제공자(Yahoo, Fastmail 등): 별도 후속 이슈
- Apple OAuth 도입 시도(Apple 미제공)
- 양방향 sync(외부 Apple Calendar 변경 → trip-planner): 별도 검토
- macOS/iOS native 앱: 본 피처는 web 기반
- envelope encryption / KMS: 사용자 1000명 도달 시 검토
- provider 변경 흐름 UI 단일 트랜잭션화

## Open Questions

1. 위자드 UI는 `/trips/{id}/calendar/connect-apple` 같은 단일 페이지 vs 모달? — plan에서 결정.
2. `apple_calendar_credentials.lastValidatedAt`을 sync마다 갱신 vs 위자드 검증 시에만? — 401 직전 상태 추적용.
3. tsdav 2.x의 어떤 메서드를 wrap할지 vs 직접 fetch? — plan에서 의존성 표면적 결정.
