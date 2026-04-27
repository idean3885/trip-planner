# Quickstart: Apple iCloud CalDAV Provider

**Feature**: `025-apple-caldav-provider` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 검증 시나리오를 정의한다. 외부 의존(iCloud)과 사용자 입력(Apple ID + 16자리 암호)이 핵심이라, 자동 단위/통합 테스트(mock) + 수동 dev 환경 측정 두 트랙으로 충족한다.

## US1 — Apple 첫 연결 + 첫 sync

### Scenario 1-1: 위자드 → 캘린더 자동 생성 → 첫 sync 90초 이내

dev 환경(dev.trip.idean.me)에서 본인 Apple ID로 위자드 시작 → 가이드 캡쳐 따라 16자리 앱 암호 발급 → 입력 → MKCALENDAR 자동 생성 → 첫 sync 트리거 → iPhone Calendar 앱에 이벤트 표시.

### Scenario 1-2: VTODO 캘린더 자동 필터

VEVENT 5개 + VTODO 1개 보유 계정으로 "기존 선택" 옵션 노출 → 목록에 VEVENT 5개만 보임.

### Scenario 1-3: 잘못된 암호 401 즉시 안내

위자드 Step 3에서 잘못된 16자리 암호 입력 → 검증 호출이 401 반환 → 위자드가 "암호가 잘못되었습니다 — 폐기·재발급 후 다시 시도" 안내 + appleid.apple.com 링크 노출.

### Evidence

- 자동 테스트: `tests/integration/calendar/apple-wizard-validate.test.ts` (tsdav mock 401·200 분기)
- 자동 테스트: `tests/unit/calendar/apple-capability.test.ts` (capability 정적 검증)
- 자동 테스트: `tests/unit/calendar/apple-vtodo-filter.test.ts` (VTODO 필터)
- 자동 테스트: `tests/unit/calendar/apple-crypto-roundtrip.test.ts` (암호화 round-trip + 잘못된 키 실패)
- 수동 체크리스트 (dev.trip.idean.me, 본인 Apple ID):
  - [ ] 위자드 Step 1~3 가이드를 따라 16자리 암호 입력 후 MKCALENDAR 응답 201 + 캘린더 URL 보관
  - [ ] 본인 iPhone Calendar 앱에서 "trip-planner" 캘린더 표시 확인
  - [ ] 첫 sync 트리거 → trip 활동이 VEVENT로 iCloud에 PUT, iPhone에서 시간대·제목·위치 정확히 표시
  - [ ] 위자드 시작 → iPhone 표시까지 90초 이내 (가이드 읽기 시간 제외)
- 스크린샷: 위자드 4단계 캡쳐(Step 1·2·3·4) — 본 피처 구현 후 추가

---

## US2 — 401 즉시 재인증 안내

### Scenario 2-1: sync 중 401 → UI 배너 + 재인증 링크

DB의 encryptedPassword를 일부러 깨뜨린 link에서 sync 트리거 → 응답에 `error.code = "auth_invalid"` + UI 배너로 "Apple 앱 암호가 더 이상 유효하지 않습니다 — 폐기·재발급 후 재입력" + 재인증 링크 노출.

### Scenario 2-2: 재인증 후 캘린더 재생성 없이 복구

위 배너에서 "재인증" 클릭 → 위자드 진입 → 새 16자리 암호 입력 → AppleCalendarCredential 갱신만 발생, MKCALENDAR 호출 0회 (기존 link.calendarId 그대로 사용).

### Evidence

- 자동 테스트: `tests/unit/calendar/apple-sync-401.test.ts`
- 자동 테스트: `tests/unit/calendar/apple-classify-error.test.ts` (401·412·5xx vocabulary 매핑)
- 수동 체크리스트:
  - [ ] dev에서 의도적 무효 암호로 link 갱신 → sync 트리거 → 응답 `auth_invalid` + UI 배너 노출
  - [ ] 재인증 위자드로 새 암호 입력 → 캘린더 재생성 없이 다음 sync 정상 동작

---

## US3 — VTODO 필터 + manual ACL 안내

### Scenario 3-1: 멤버 trip의 Apple 연결 → 자동 ACL 호출 0회

멤버 2명 trip에서 Apple 연결 → connect 응답에 `members: []` (자동 부여 시도 0) + 안내 텍스트 `manualAclGuidance: "Apple Calendar 앱에서 [member1@example.com, member2@example.com]을 캘린더 공유로 직접 초대해 주세요"` 포함.

### Scenario 3-2: 멤버 라이프사이클 훅이 Apple link에서 no-op

Apple link trip에서 멤버 가입·역할 변경·탈퇴 시 `appleProvider.upsertMemberAcl/revokeMemberAcl` 호출 0회. 로그에 안내 메시지만 기록.

### Evidence

- 자동 테스트: `tests/unit/calendar/service-manual-acl-branch.test.ts` (capability 분기 검증)
- 자동 테스트: `tests/unit/calendar/apple-capability.test.ts`
- 수동 체크리스트:
  - [ ] dev에서 멤버 2명 trip의 Apple 연결 → 응답 body에 `manualAclGuidance` 텍스트 확인
  - [ ] 멤버 추가/제거 시 upsertMemberAcl 호출 로그 0건

---

## Google 회귀 0 (필수 게이트)

### Scenario G-1: Google 사용자 connect/sync/subscribe schema-equivalent

`link.provider == "GOOGLE"` trip 5건의 응답이 본 피처 머지 직전 스냅샷과 schema-equivalent. 사용자 가시 동작·UI도 동일.

### Evidence

- 자동 테스트: `tests/integration/calendar/google-no-regress.test.ts`
- 수동 체크리스트:
  - [ ] dev의 Google trip에서 캘린더 패널이 v2.10.x 동등 표시
  - [ ] "다시 반영하기" 토스트 문구 동일
  - [ ] 호스트 sync 트리거 → 외부 캘린더 이벤트 변화 동일
