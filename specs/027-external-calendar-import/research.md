# Research: 외부 캘린더 import

**Branch**: `027-external-calendar-import` · **Date**: 2026-05-27

본 문서는 plan.md Phase 0에서 식별된 의사결정 8건의 근거와 대안 평가를 모아둔다. plan.md 각 결정 항목은 본 문서의 동일 번호 섹션을 참조한다.

## 1. provider별 외부 캘린더 fetch 인터페이스

**Decision**: 어댑터 인터페이스 `ExternalCalendarFetcher` 정의. `listCalendars(userId): ExternalCalendar[]`, `listEvents(userId, calendarId, range): ExternalEvent[]` 두 메서드만 노출. Google·Apple 각각의 구현체가 같은 시그니처를 따른다.

**Rationale**: spec 024 `calendar-provider-abstraction`이 이미 push 방향(Activity → 외부 이벤트)에서 같은 어댑터 패턴을 정착시켰다. pull 방향에서도 동일 인터페이스 명명을 따르면 사용자(혹은 후속 ADR)가 양방향 통합을 검토할 때 인덱스가 일치한다.

**Alternatives considered**:
- **provider별 import 서비스 분리** (`googleImportService.ts`, `appleImportService.ts`) — 멱등성·요약 처리가 두 곳에 중복. provider 추가 시 N+1 작업. 기각.
- **단일 어댑터에 provider 분기 if/else** — 어댑터 패턴 자체를 깨뜨림. 기각.

## 2. 외부 이벤트 식별자 안정성

**Decision**: `externalEventId` 컬럼에 provider가 부여한 raw ID 그대로 저장. Google은 `event.id`(영속), Apple은 `UID`(iCalendar 표준). 유니크 키는 `(provider, externalCalendarId, externalEventId)` 3-tuple.

**Rationale**:
- Google Calendar API docs: `event.id`는 생성 시점부터 영속이며 이벤트 이동(다른 캘린더로 옮김) 시에도 유지. 다만 다른 캘린더로 이동 시 새 캘린더에서 동일 ID로 동작.
- Apple CalDAV: iCalendar 표준 `UID`는 글로벌 유니크가 명세상 요구. 클라이언트들도 영속을 따른다.
- 사용자가 외부에서 이벤트를 삭제 후 동일 내용으로 다시 만들면 새 ID가 발급. 새 draft를 만드는 것이 의도(서로 다른 사용자 의도).

**Alternatives considered**:
- **title+start hash** — 의도적 중복(왕복 항공편, 식사 N회)이 모두 같은 hash. 기각.
- **외부 이벤트 created timestamp + title** — 같은 분에 두 이벤트가 만들어지면 충돌. 기각.

## 3. 권한 (헌법 VI)

**Decision**: 권한 매트릭스에 신규 행 추가.

| 행위 | OWNER | HOST | GUEST |
|------|-------|------|-------|
| 외부 캘린더 import | O | O | X |

**Rationale**: import는 trip의 일정을 늘리는 작업이며, 헌법 매트릭스의 "일정/활동 편집"(OWNER·HOST O, GUEST X)과 동일 권한 클래스에 속한다. 호스트가 일정을 편성할 권한이 있다면 import도 동일하게 허용해야 일관성이 유지된다. draft → Activity 승격은 "Activity 생성"과 동치이므로 별도 행위 추가 불요(기존 "일정/활동 편집"에 흡수).

**Alternatives considered**:
- **OWNER 한정** — 호스트의 일정 편성 권한과 정책 충돌. 기각.
- **GUEST 허용** — 헌법 VI Permission Matrix와 직접 충돌. 기각.

## 4. 멱등성 구현

**Decision**: 데이터베이스 유니크 인덱스 `@@unique([provider, externalCalendarId, externalEventId])` + 어플리케이션 레벨 lookup 이중 안전망. import 서비스는 받은 외부 이벤트 N건을 순회하며 lookup → 존재 시 skip 카운트 증가. 존재 안 함이면 신규 draft create. race 발생 시 유니크 제약이 fallback.

**Rationale**: 어플리케이션 lookup만 두면 동시 import race에서 같은 draft가 두 개 만들어질 수 있음. 유니크 제약만 두면 사용자에게 "skipped" 카운트를 정확히 보고할 수 없음. 둘 다 둔다.

"다시 가져오기"(refresh)는 별도 엔드포인트로 분리. 같은 draft를 lookup한 후 매핑 가능 필드만 update, 매핑 불가 필드(사용자가 채운 값)는 update에서 제외.

**Alternatives considered**:
- **upsert(create-or-update)** — 매핑 불가 필드 보존 로직을 SQL ON CONFLICT 절에 박아야 함. Prisma raw query 의존도 증가. 기각.
- **유니크 제약 없이 어플리케이션 lookup만** — race 위험. 기각.

## 5. import 트리거 UX 위치

**Decision**: trip 상세 페이지의 기존 캘린더 패널 옆에 "외부 캘린더에서 일정 가져오기" 버튼 추가. 클릭 시 모달 열림 → 외부 캘린더 목록 표시 → 1개 선택 → "가져오기" 실행.

**Rationale**: spec 019/020에서 도입된 캘린더 push 흐름과 시각적으로 같은 위치에 있어야 사용자가 "여기는 캘린더 관련" 멘탈 모델을 유지한다. 별도 페이지·메뉴는 발견성 저하.

**Alternatives considered**:
- **trip 일정 목록 상단 "추가" 메뉴 안** — 가시성은 좋으나 캘린더 push 위치와 분산. 기각.
- **/settings에 import 페이지 별도 추가** — trip 컨텍스트 손실. 기각.

## 6. draft 표시 위치

**Decision**: trip 일정 목록(Day별 Activity 리스트)에 정식 Activity와 draft를 같이 표시. draft는 dimmed 스타일(opacity ~0.65) + "외부 캘린더에서 가져옴" 배지로 구분. 클릭 시 승격 모달.

**Rationale**: 별도 탭에 들어가면 사용자가 "내가 가져온 일정이 어디 갔지" 라는 발견 문제를 만남. 같은 일정 흐름 안에서 즉시 보이고 승격 가능해야 import 가치가 닫힌다.

**Alternatives considered**:
- **별도 "Draft" 탭** — 발견성 저하. 기각.
- **알림/배지로만 표시** — 일정 흐름과 분리되어 승격이 별도 작업처럼 보임. 기각.

## 7. 외부 계정 미연결 처리

**Decision**: import 트리거 모달 안에서 "캘린더 계정을 먼저 연결하세요" 안내 + 기존 연결 페이지(`/settings/calendars`) 링크 노출. import 자체는 시작 안 함.

**Rationale**: FR-011·SC-005 충족. 옵션을 숨기면 사용자가 "기능 존재 자체"를 모름. 다음 행동(계정 연결)을 안내해야 막다른 길 회피.

**Alternatives considered**:
- **버튼 숨김** — 발견성 저하. 기각.
- **import 호출 후 401·400 응답으로 안내** — 사용자가 두 번 클릭해야 함. 기각.

## 8. 부분 실패 처리

**Decision**: import 1 batch 안에서 이벤트 단위 try/catch. 성공·skip·실패를 카운트하고 `failedCount`로 합산. 응답에는 실패 이벤트의 외부 제목 첫 3건을 예시로 보여줌(privacy 고려해 description은 노출 안 함). 실패 사유는 서버 로그(structured)에만 기록.

**Rationale**:
- 외부 provider 일시 오류로 전체 batch를 막으면 사용자 가치 손실.
- 멱등성(섹션 4)으로 재실행 안전.
- privacy: 사용자가 외부 캘린더에 사적 description을 적었을 수 있어 응답에는 title만.

**Alternatives considered**:
- **atomic batch** — 외부 호출 N건을 트랜잭션에 묶을 수 없음(외부 API는 트랜잭션 미지원). 기각.
- **실패 시 전체 rollback + 첫 실패 사유만 응답** — 부분 성공의 가치 손실. 기각.

## 추가 참고

- **외부 이벤트 timezone 처리**: Google·Apple 모두 RFC5545·dateTime + timezone 또는 floating-time을 지원. import 시 timezone이 명시되어 있으면 startTimezone/endTimezone에 저장, 미명시(floating)면 `null`로 두고 승격 시 사용자 선택.
- **all-day 이벤트**: `isAllDay: true` 플래그 + startTime은 trip 타임존 기준 00:00, endTime은 익일 00:00로 저장. 승격 시 사용자가 시각을 명시하면 isAllDay = false 전환.
- **반복 이벤트**: Google `recurrence` / Apple `RRULE`은 전개하지 않고 trip 기간 내 인스턴스(`recurringEventId` 기준)만 각각 단일 이벤트처럼 draft 생성. 반복 규칙 자체는 보관하지 않음(spec FR-012).
- **외부 캘린더 목록 캐싱**: 사용자별 외부 계정 캘린더 목록은 trip 상세 진입 시 한 번 fetch. 모달 재오픈 시 stale-while-revalidate 패턴. 비용·요청 수 영향 미미.

## Open Items (Phase 2/구현 단계로 이월)

- 외부 이벤트의 attachment(첨부 파일·url)는 본 마일스톤 스코프 외. draft `description`에 텍스트로만 보존하거나 무시.
- import 결과 요약 UI 위치: 토스트 vs trip 페이지 영역. spec 026 토큰 사용 가능하면 토스트 기본.
- 실패 이벤트의 사용자측 재시도 UX는 본 마일스톤에서 다루지 않음(재실행 트리거로 충분).
