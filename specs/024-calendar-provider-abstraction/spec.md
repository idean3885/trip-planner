# Feature Specification: 캘린더 provider 추상화

**Feature Branch**: `024-calendar-provider-abstraction`
**Created**: 2026-04-27
**Status**: Draft
**Input**: 두 번째 캘린더 provider(Apple iCloud, [POC #345](../../docs/research/apple-caldav-poc.md)) 도입 전 단계로, Google과 Apple을 동일 개념으로 다루는 추상화 계층을 도입한다. 기존 Google 사용자는 회귀 없이 그대로 사용하고, 후속 #417에서 Apple이 같은 모양으로 붙는다. Closes #416.

## Background

v2.8.0~v2.10.0에서 Google Calendar 한 가지에 특화된 코드(`gcal_links`, `trip_calendar_links`, `trip_calendar_event_mappings`, `member_calendar_subscriptions`, `/api/v2/trips/{id}/calendar/*`)가 굳어졌다. POC #345에서 Apple iCloud CalDAV 연동의 핵심 동작이 검증됐고, 두 provider를 동시에 다루기 위한 공통 모델·UX·에러 톤을 먼저 잡지 않으면 Apple 도입 시 라우트·DB·UI가 두 갈래로 갈라진다.

본 피처는 **추상화 도입 자체**가 목표이며, 사용자 가시 변경은 의도적으로 0에 가깝다. 실제 새 기능(Apple)은 후속 #417에서 본 추상화 위에 얹힌다.

## Clarifications *(초안 작성 중 모호했던 결정 봉합)*

1. **사용자 가시 변경 0** — 본 피처의 모든 변경은 내부 리팩토링 + 데이터 모델 expand. 기존 Google 사용자가 보는 화면·버튼·동기화 동작은 동일해야 한다. 회귀가 1건이라도 발견되면 본 피처는 미완으로 간주한다.

2. **무중단 마이그레이션 (expand-and-contract)** — DB 컬럼 추가는 기본값을 두어 기존 데이터를 건드리지 않는다(expand). 코드 분기는 새 추상화 + 옛 직접 접근이 한동안 병존하다 단계적으로 옛 분기를 제거(contract). 본 피처는 expand+migrate 단계까지를 포함하고, 옛 분기 contract는 후속 정리 회차에서 진행한다. 패턴 정책: [ADR-0005](../../docs/adr/0005-expand-and-contract-pattern.md).

3. **provider 식별자는 한국어 정본 없이 영어 식별자 그대로** — `GOOGLE`, `APPLE` 같은 코드 식별자는 사용자 화면에 직접 노출되지 않는다(노출 시에는 "구글 캘린더"·"애플 캘린더" 한국어로 변환). 따라서 `glossary.md`에 신규 한국어 용어를 추가할 필요는 없으며, 기존 "공유 캘린더"·"내 구독" 같은 용어가 두 provider에 그대로 적용된다.

4. **에러 분류는 공통 vocabulary로 정규화** — 두 provider 모두 401·412·일시 오류·권한 회수·미등록 사용자(Apple엔 해당 없음, Google Testing 모드 한정) 같은 사건이 발생한다. 사용자에게 노출되는 에러 톤은 provider 무관 동일하게 정한다(예: 401은 항상 "더 이상 유효하지 않은 인증 — 다시 연결해 주세요" 안내, 412는 항상 "외부에서 직접 수정된 이벤트는 덮어쓰지 않고 건너뜀"). 단, "다시 연결" 액션의 행동은 provider별로 다르다(Google은 OAuth 재동의, Apple은 앱 암호 재발급).

5. **본 피처는 사용자 1순위 흐름 변경 없음** — Google 단일 provider 환경에서 사용자는 기존 그대로 "공유 캘린더 연결" 버튼 → 동의 → 완료 흐름을 본다. provider 선택 UI는 후속 #417에서 Apple이 추가될 때 비로소 노출된다. 본 피처에서는 "Apple 추가 가능 토대" 기재만 있고 사용자 화면엔 변화가 없다.

6. **여행당 1 provider · 1 외부 캘린더 (단, 외부 캘린더 자체는 여러 여행이 공유 가능)** — 한 여행은 동시에 한 가지 외부 캘린더 provider의 한 외부 캘린더에만 연결될 수 있다. provider 변경 = 기존 해제 + 새 연결 두 단계. **다만 사용자의 외부 계정 안에서 같은 캘린더(`calendarId`)를 다른 여행이 함께 가리키는 것은 허용**된다.
   - **왜 1 provider · 1 캘린더**: 캘린더 연동의 본 목적은 "모바일에서 웹 없이 편하게 보기". 같은 여행을 두 곳 동시에 등록할 가치가 사용자에게 거의 없다.
   - **왜 외부 캘린더 공유는 허용**: 매 여행마다 새 캘린더가 생기면 외부 캘린더 목록이 누적돼 사용자가 피로해진다. **이전 여행이 들어간 "여행" 캘린더에 새 여행도 이어서 추가**하는 흐름이 자연스럽다.
   - **현재 모델 정합**: `TripCalendarLink.tripId`가 이미 `@unique`라 "여행당 link 1개"는 자동 보장. `calendarId`는 unique가 아니라 같은 외부 캘린더가 여러 link에 등장 가능. 본 피처는 provider 컬럼만 추가, 모델 변경 최소.

7. **캘린더 식별 단위 = 외부 캘린더 ID (생성·선택 모두 동일)** — 연결 시 사용자에게 두 옵션을 제공: (a) 새 캘린더 자동 생성, (b) 기존 캘린더 선택(VEVENT 컴포넌트 보유 캘린더 목록에서). 두 흐름 모두 같은 결과(특정 `calendarId`로 link 생성). UI는 #417에서 노출.

8. **활동 격리 보장 (덮어쓰기 없음)** — 같은 외부 캘린더가 여러 여행에 공유될 때, 활동↔이벤트 매핑은 활동(`activity_id`) 단위로 격리된다. 한 여행의 활동 수정/삭제는 자기 매핑된 이벤트만 영향. 두 여행이 같은 시간대 활동을 등록하면 외부 캘린더에서 두 이벤트가 나란히 표시되며 충돌 없음. 외부 직접 수정 412 처리도 자기 활동의 sync에서만 skipped로 카운트.

9. **ACL 회수는 다른 여행 공유 여부 확인 후** — 여행 해제 시 멤버 ACL을 즉시 회수하면, 같은 외부 캘린더를 공유 중인 다른 여행의 멤버가 그 캘린더를 못 보게 되는 부작용이 발생한다. 따라서 회수 전에 **그 멤버가 다른 활성 link로 같은 캘린더에 접근 권한이 필요한지** 확인하고 필요하면 회수 보류. 캘린더 자체는 절대 삭제하지 않는다(현 정책 그대로).
   - **추상화 인터페이스에 반영**: `revokeMemberAcl({ calendarId, userId, retainIfStillNeeded: true })` 형태. 구현체가 retain 판정 로직 수행.

10. **변경 흐름 UX (#417에서 디테일)**: 다른 provider 또는 다른 외부 캘린더로 갈아탈 때 "기존 연결을 해제하고 [새 provider | 새 캘린더]로 다시 연결합니다" 확인 다이얼로그 → 두 단계. 멤버 ACL은 새 link 기준으로 재부여.

11. **멤버별 다른 provider 시청 시나리오 — 비범위**: "주인은 Google에 연결했지만 게스트는 본인 iPhone에서 iCloud로 보고 싶다" 같은 시나리오는 본 피처·#417 모두 비범위. 별도 후속 검토(예: 외부 ICS export 또는 멤버별 추가 구독).

12. **provider capability 노출 (Apple ACL 미검증 영역 캡슐화)** — provider별로 자동화 가능 영역이 다르다(특히 멤버 ACL 자동 부여). 추상화 인터페이스에 capability 플래그를 두어 호출자가 분기할 수 있게 한다.
   - **capability 예시**: `autoMemberAcl: "auto" | "manual" | "unsupported"`, `supportsCalendarCreation: boolean`, `supportsCalendarSelection: boolean`.
   - **Google 기본값** (v2.9.0 검증 완료): `autoMemberAcl: "auto"` — 서버가 멤버 ACL을 자동 부여(writer/reader).
   - **Apple 잠정값** (POC #345 미검증 영역): 본 피처에서는 잠정 `autoMemberAcl: "manual"`로 가정 — 사용자가 macOS/iOS Calendar 앱에서 직접 멤버 초대해야 하는 흐름. 실측은 #417에서 진행 후 plan/spec에 결과 반영. 검증 결과 자동 부여 가능하면 `"auto"`로 승격.
   - **호출자 분기**: 멤버 ACL 흐름은 capability를 읽어 (a) 자동 호출 또는 (b) 사용자에게 "외부 캘린더 앱에서 직접 멤버를 추가해 주세요" 안내로 분기. UI 분기는 #417에서 노출.
   - **본 피처 단독 영향**: Google 한 가지라 capability가 항상 `"auto"` → 동작 변화 0.

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그를 통해 후속 자동 검증과 연결된다:

- `[artifact: <path>|<path>::<symbol>]` — 산출 파일 식별자(drift 감사 기준)
- `[why: <short-tag>]` — 추적 그룹 키(plan↔tasks 커버리지·이슈 합산)
- `[multi-step: N]` — plan bullet이 다단 작업일 때 최소 매핑 태스크 수(N ≥ 2)
- `[migration-type: schema-only | data-migration]` — 마이그레이션 산출물 구분

본 피처의 마이그레이션은 모두 `schema-only`(컬럼 추가, 기본값 부여)이며 `data-migration`은 없다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 기존 구글 캘린더 사용자 회귀 0 (Priority: P1)

이미 v2.9.0~v2.10.0 흐름으로 공유 캘린더를 연결해 사용 중인 동행자들이, 본 피처 배포 후에도 같은 화면·같은 버튼·같은 동기화 결과를 그대로 경험한다.

**Why this priority**: abstraction 도입의 정당성은 "기존을 깨지 않는다"가 충족돼야 비로소 시작된다. 회귀가 한 건이라도 발생하면 본 피처는 무가치하다.

**Independent Test**: 본 피처 배포 후 같은 여행에서 (a) 캘린더 연결 상태 조회, (b) "다시 반영하기" 트리거, (c) "내 구글 캘린더에 추가/제거", (d) 호스트 sync 트리거가 직전 버전과 동일한 응답·UI를 보이는지 동행자 시점에서 확인.

**Acceptance Scenarios**:

1. **Given** 주인이 v2.9.0/v2.10.0 흐름으로 공유 캘린더를 연결한 여행, **When** 본 피처 배포 후 페이지에 진입, **Then** "구글 캘린더 연결됨" 트리거가 동일하게 노출되고 다이얼로그 안의 정보(캘린더명·마지막 반영 시각·건너뜀 카운트)도 동일하다.
2. **Given** 호스트 동행자, **When** "다시 반영하기" 버튼을 누름, **Then** 직전 버전과 동일한 토스트(`최신 상태로 반영했습니다` 또는 `부분 반영 · 건너뜀 N · 실패 M`)가 뜨고 외부 캘린더의 이벤트 상태가 동일하게 갱신된다.
3. **Given** 게스트 동행자, **When** "내 구글 캘린더에 추가"를 누름, **Then** 직전 버전과 동일한 옵트인 흐름이 동작한다.
4. **Given** 외부 MCP 클라이언트, **When** 기존 v1·v2 엔드포인트(`/api/trips/...`, `/api/v2/trips/.../calendar*`)를 호출, **Then** 응답 스키마는 무변경이며 동일 동작을 보인다.

---

### User Story 2 — provider 무관 일관된 에러 톤 (Priority: P2)

캘린더 연동 중 발생하는 사용자 가시 에러(인증 무효·외부에서 직접 수정·일시적 네트워크 실패 등)는 provider가 무엇이든 같은 톤·같은 위치·같은 액션 옵션으로 노출된다.

**Why this priority**: 후속 #417 Apple 도입 시 사용자가 두 provider 사이에서 다른 에러 메시지·다른 복구 절차를 학습하지 않아도 되도록 토대를 잡는다. 본 피처 단독으로는 Google 한 가지에서만 검증되지만, 추상화의 출구는 Apple 도입 시점이다.

**Independent Test**: 시뮬레이션 또는 의도적 401 유발(폐기된 토큰 사용)로 사용자 가시 에러 표시가 공통 vocabulary(예: "더 이상 유효하지 않은 인증")를 사용하는지 확인.

**Acceptance Scenarios**:

1. **Given** 사용자의 Google 토큰이 외부에서 회수된 상태, **When** "다시 반영하기"를 누름, **Then** "더 이상 유효하지 않은 인증 — 다시 연결해 주세요" 안내 + "다시 연결" 액션이 노출된다.
2. **Given** 사용자가 외부 캘린더에서 이벤트를 직접 수정한 상태, **When** sync가 실행됨, **Then** "직접 수정된 이벤트는 덮어쓰지 않고 건너뜀" 안내가 동일 카운터에 누적된다.
3. **Given** 일시적 네트워크 실패, **When** sync가 실행됨, **Then** 사용자에겐 부분 반영 토스트만 노출되고 다음 sync 시 자동 재시도된다.

---

### User Story 3 — 미래 확장성 토대 (Priority: P3)

본 피처 머지 후, 후속 피처(`apple-caldav-provider`, #417)가 사용자 가시 라우트·UI·DB 구조를 다시 분기시키지 않고 추상화 위에서 새 provider 구현체를 추가하는 것만으로 동작 가능하다.

**Why this priority**: 가치 검증은 #417 시작 시점에야 이뤄진다. 본 피처에서는 "Apple 추가가 abstraction 위에서 가능하다"의 기준만 명시하고, 실제 추가는 #417 범위.

**Independent Test**: #417 시작 시점에 본 피처가 정한 인터페이스만으로 Apple 구현체를 추가해 사용자 흐름(연결·sync·해제)이 동작하는지 확인. 본 피처 단독 머지 시점에서는 추상화 인터페이스가 정의돼 있고 Google 구현체가 그 인터페이스를 만족하는지 확인.

**Acceptance Scenarios**:

1. **Given** 본 피처가 정의한 provider 인터페이스, **When** #417에서 Apple 구현체를 추가, **Then** 라우트 핸들러·DB 모델·UI 컴포넌트의 코드 변경 없이 새 provider가 동작한다.
2. **Given** 본 피처 머지 후, **When** 추상화 인터페이스를 외부에서 사용하는 모든 호출 지점을 검토, **Then** Google 직접 호출이 남아 있는 분기가 명시 목록에 포함되어 있고 contract 후속 이슈에서 다뤄질 예정으로 분류된다.

---

### Edge Cases

- **마이그레이션 중 동시 sync**: expand 단계에서 신·구 코드가 같은 DB row에 동시 접근. row의 새 컬럼은 기본값으로 채워져 있어 옛 코드가 깨지지 않음. 신 코드는 컬럼 값을 읽어 분기.
- **provider 식별자 미설정 row**: 백필 누락된 기존 row는 기본값(`GOOGLE`)으로 해석. 명시적 NULL은 없도록 NOT NULL + DEFAULT 제약.
- **외부 MCP 클라이언트의 v1 호출**: provider 정보가 없는 v1 응답이 그대로 유지. 응답 스키마 변경 0.
- **에러 vocabulary 누락 케이스**: 새 provider에서만 발생하는 에러는 본 피처의 공통 vocabulary 외 코드로 fallback("일시적 오류 — 잠시 후 다시 시도해 주세요"). #417에서 vocabulary를 보강.
- **이미 다른 provider 연결된 여행에 새 provider 연결 시도**: `already_linked` 에러로 응답. 사용자에겐 "이 여행은 이미 [구글|애플] 캘린더에 연결되어 있습니다. 변경하려면 먼저 연결을 해제해 주세요" 안내 (실제 노출은 #417에서). 본 피처 단독으로는 Google 한 가지라 케이스 발현 없음.
- **멤버 중 일부가 다른 provider를 선호**: 본 피처·#417 모두 비범위. 외부 ICS export 또는 별도 후속 검토.
- **두 여행이 같은 외부 캘린더를 공유 + 같은 시간대 활동**: 외부 캘린더에 두 이벤트가 나란히 표시. 충돌 없음(활동 단위 격리). 사용자가 외부에서 한쪽을 직접 지우면 그 활동의 다음 sync에서 매핑 깨짐 → 기존 정책대로 412 → skipped 처리 또는 재생성.
- **여행 A 해제 시 멤버 X가 여행 B에서 같은 캘린더에 접근 중**: ACL 회수 보류. 멤버 X는 여행 A 이벤트만 외부 캘린더에서 보지 못하게 되는 게 아니라, 캘린더 ACL은 그대로 유지되어 여행 B 이벤트를 계속 본다. 여행 A 이벤트 본체는 매핑 삭제와 함께 외부 캘린더에서 사라짐(활동 격리).
- **두 여행이 같은 캘린더 공유 + 한 여행만 멤버 변경**: 멤버 추가/제거 시 ACL 부여/회수가 그 여행 단독으로 이뤄지지 않고, "다른 여행에서도 필요한가" 판정 후 결정. 추상화 인터페이스에서 이 판정을 캡슐화.
- **capability `autoMemberAcl: "manual"` provider (Apple 잠정)**: 멤버 ACL 자동 부여 호출이 no-op 또는 명시적 unsupported 반환. UI는 사용자에게 "외부 캘린더 앱에서 직접 멤버를 추가해 주세요" 안내(#417에서 표면화). 본 #416 단독으로는 Google만 있어 케이스 발현 없음.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST 기존 v2.9.0~v2.10.0 캘린더 라우트(`/api/v2/trips/{id}/calendar*`, `/api/trips/{id}/gcal/*`)의 응답 스키마를 변경하지 않은 채 내부 호출 경로를 추상화 인터페이스로 위임한다.
- **FR-002**: System MUST 캘린더 연결 정보를 저장하는 영속 모델에 provider 식별자(예: `GOOGLE`)를 추가하고 기본값을 부여한다 — 기존 row는 백필 없이 기본값으로 해석된다.
- **FR-003**: System MUST 캘린더 이벤트 매핑(외부 이벤트 ID·ETag·마지막 동기화 시각)을 provider 무관 공통 데이터 형태로 다룬다.
- **FR-004**: System MUST 사용자 가시 에러를 공통 vocabulary로 정규화한다 — 401, 412, 권한 회수, 일시 실패, 미등록(Testing 모드 한정) 다섯 분류.
- **FR-005**: System MUST 외부 MCP 클라이언트가 사용하는 v1 응답 스키마를 무변경 유지한다 — `sortOrder` 동적 부착, `linked` boolean, `link.calendarName` 등 기존 필드 모두 동일.
- **FR-006**: System MUST 본 피처가 도입한 추상화 인터페이스의 명세(메서드 시그니처·반환 타입)를 plan.md에 명시하고, 후속 #417에서 같은 명세로 Apple 구현체를 추가 가능함을 보장한다.
- **FR-007**: System MUST expand-and-contract 패턴을 따른다 — 본 피처 머지 시점에는 신·구 분기가 병존하며, 옛 분기 제거(contract)는 별도 후속 이슈에서 진행한다.
- **FR-008**: System MUST 본 피처의 모든 DB 마이그레이션은 `schema-only`로 표기되고 데이터 변형 마이그레이션은 포함되지 않는다.
- **FR-009**: System MUST 한 여행이 동시에 둘 이상의 외부 캘린더 provider 또는 둘 이상의 외부 캘린더에 연결되는 상태를 허용하지 않는다 — 데이터 모델 수준에서 여행당 link 1개 제약을 유지하고, 추상화 인터페이스는 "이미 다른 link 있음"을 명시 응답한다(에러 분류: `already_linked`).
- **FR-010**: System MUST 같은 외부 캘린더(`calendarId`)가 여러 여행에 의해 공유되는 상태를 허용한다 — `calendarId`에는 unique 제약을 두지 않는다.
- **FR-011**: System MUST 캘린더 연결 시 "새 캘린더 자동 생성" 또는 "기존 캘린더 선택" 두 흐름을 추상화 인터페이스에서 동일 메서드(같은 결과 — 특정 `calendarId`로 link 생성)로 다룬다.
- **FR-012**: System MUST 활동 ↔ 외부 이벤트 매핑이 활동 단위로 격리된다 — 같은 외부 캘린더를 여러 여행이 공유해도 한 여행의 활동 수정/삭제가 다른 여행의 매핑에 영향을 주지 않는다.
- **FR-013**: System MUST 여행 해제 시 멤버 ACL 회수 전에 "그 멤버가 다른 활성 link로 같은 외부 캘린더에 접근이 필요한지" 확인하고, 필요하면 회수를 보류한다. 캘린더 자체는 절대 외부에서 삭제하지 않는다.
- **FR-014**: System MUST 변경 흐름(provider 또는 캘린더 변경)의 의미를 "기존 해제 + 새 연결" 두 단계로 정의한다 — 본 피처에서는 두 단계가 별개 액션으로 노출되고, 한 번에 자동화하는 UX는 #417 범위.
- **FR-015**: System MUST provider 구현체가 자기 capability를 명시 노출한다 — 최소 `autoMemberAcl: "auto" | "manual" | "unsupported"`, `supportsCalendarCreation`, `supportsCalendarSelection` 세 항목. 호출자(라우트·서비스·UI)는 capability를 읽어 분기한다.

### Key Entities

- **CalendarProvider 인터페이스**: 추상화의 핵심 타입. 외부 캘린더 서비스가 만족해야 하는 동작 집합 — 인증, 캘린더 목록 조회, 새 캘린더 생성, 기존 캘린더 선택(같은 메서드로 통일), 이벤트 PUT/UPDATE/DELETE, 상태 조회, 에러 분류, 멤버 ACL 부여/회수(retain 판정 포함), capability 노출.
- **CalendarLink (모델 — 기존 `TripCalendarLink` 확장 또는 신규)**: 여행 ↔ 외부 캘린더 1:1 연결. provider 식별자, `calendarId`(unique 아님 — 여러 여행이 같은 캘린더 공유 가능), 마지막 동기화 시각, 마지막 에러.
- **CalendarEventMapping**: 활동 ↔ 외부 이벤트 1:1 매핑. provider 무관 공통 형태(외부 이벤트 ID, ETag, 동기화 시각). 활동 단위 격리 보장.
- **에러 분류 enum**: `auth_invalid`, `precondition_failed`, `revoked`, `transient_failure`, `unregistered_user`, `already_linked`. 사용자 가시 안내문은 본 enum의 함수.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 본 피처 배포 후 1주 내 기존 Google 사용자가 보는 캘린더 패널 동작에 대한 사용자 보고 회귀 건수 = 0.
- **SC-002**: v1 응답 스키마(`/api/trips/.../gcal/*`, `/api/v2/trips/.../calendar*`) 자동 회귀 테스트 = 100% 통과.
- **SC-003**: 추상화 인터페이스를 사용하는 라우트·서비스 코드의 직접 Google API 호출 분기 수 = 0 (모든 외부 호출은 인터페이스 메서드 경유). 단, contract 후속에서 제거될 옛 분기는 별도 목록으로 분류.
- **SC-004**: #417 Apple 구현 시 라우트·DB 모델·UI 컴포넌트 신규 추가/수정 없이 새 provider 클래스(또는 모듈) 추가만으로 핵심 흐름(연결·sync·상태 조회) 통과 — 본 SC는 #417 머지 시점에 검증.
- **SC-005**: 사용자 가시 에러 메시지가 공통 vocabulary 6종 외 노출되는 케이스 = 0 (관찰 1주 기준).
- **SC-006**: 같은 외부 캘린더(`calendarId`)를 두 여행이 공유하는 시나리오에서, 한 여행의 활동 수정·삭제·추가가 다른 여행의 매핑 또는 이벤트에 영향을 주는 회귀 = 0 (자동 회귀 테스트 + 본 피처 기준 통합 검증).
- **SC-007**: 여행 해제 시 멤버 ACL이 잘못 회수되어 같은 캘린더 공유 중인 다른 여행 멤버가 캘린더에서 이벤트를 못 보게 되는 회귀 = 0.
- **SC-008**: provider capability를 사용하지 않고 직접 provider별 분기를 하는 호출자 코드 = 0 (capability 캡슐화의 정합성 검증).
