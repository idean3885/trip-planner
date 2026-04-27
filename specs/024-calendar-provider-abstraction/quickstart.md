# Quickstart: 캘린더 provider 추상화

**Feature**: `024-calendar-provider-abstraction` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 회귀 검증 시나리오를 정의한다. 본 피처는 사용자 가시 변경 0이 성공 기준이라, 자동 회귀 테스트 + 수동 dev 환경 검증 두 트랙으로 충족한다.

## US1 — 기존 구글 사용자 회귀 0

### Scenario 1-1: v2 라우트 응답 스키마 무변경

머지 직전 (sha=`<base-sha>`) v2 라우트 4종(POST/DELETE/GET `/api/v2/trips/<id>/calendar`, `/sync`, `/subscribe`)의 응답 스냅샷과 머지 후 응답이 schema-equivalent.

### Scenario 1-2: 기존 사용자 dev 환경 회귀 0

이미 v2.10.x로 공유 캘린더 연결한 여행에서 사용자 가시 동작(연결 상태 표시, "다시 반영하기", "내 구글 캘린더에 추가/제거", 호스트 sync 트리거)이 직전 버전과 동일.

### Evidence

- 자동 테스트: `tests/integration/calendar/v2-routes-regression.test.ts` *(미구현 — service-result-shape.test.ts가 권한·미링크·consent 회귀를 부분 커버. 통합 회귀는 contract 회차에서 추가 예정)*
- 자동 테스트: `tests/unit/calendar/service-result-shape.test.ts` (12 cases — 권한·미링크·consent 분기의 status·body 회귀)
- 수동 체크리스트 (dev.trip.idean.me):
  - [ ] 신혼여행(tripId=5)에서 캘린더 패널이 v2.10.x와 동일하게 노출됨 — 호스트 시점
  - [ ] 동일 시점 주인 시점에서 "구글 캘린더 연결됨" + 캘린더명·마지막 반영 시각·건너뜀 카운트 동일
  - [ ] "다시 반영하기" 트리거 시 토스트 문구·외부 캘린더 이벤트 변화 동일
  - [ ] 호스트가 "내 구글 캘린더에 추가/제거" 정상 동작
- 스크린샷: 해당없음 (UI 변경 0이 검증 기준)

---

## US2 — 일관 에러 톤

### Scenario 2-1: 401 (폐기 토큰) → `auth_invalid`

사용자가 외부에서 토큰을 회수한 상태에서 sync 트리거 → 응답 body의 분류 코드가 `auth_invalid`.

### Scenario 2-2: 412 (외부 직접 수정) → `precondition_failed`

외부 캘린더에서 사용자가 이벤트 수정 → sync 트리거 → 412 응답이 `precondition_failed`로 분류.

### Scenario 2-3: 403 (Testing 모드 미등록) → `unregistered_user`

Test users 미등록 계정으로 sync 트리거 → 403 응답이 `unregistered_user`로 분류.

### Evidence

- 자동 테스트: `tests/unit/calendar/google-classify-error.test.ts`
- 수동 체크리스트:
  - [ ] dev에서 의도적 401 유발(토큰 폐기) 후 응답에 `auth_invalid` 코드 노출 확인
  - [ ] 412는 v2.10.x에서 이미 검증된 분기 그대로 동작

---

## US3 — 미래 확장성 토대

### Scenario 3-1: capability 직접 호출 분기 부재

라우트·서비스 코드에서 `provider === "GOOGLE"` 같은 직접 분기가 없는지 정적 검증.

### Scenario 3-2: ACL retain 판정

여행 A 해제 시 멤버 X가 여행 B에서 같은 캘린더를 활성 사용 중이면 ACL 회수가 보류됨.

### Evidence

- 자동 테스트: `tests/unit/calendar/google-acl-retain.test.ts`
- 자동 테스트: `tests/unit/calendar/capability.test.ts`
- 수동 체크리스트:
  - [ ] dev에서 두 여행이 같은 캘린더 공유 시나리오 setup → 한 여행 해제 → 다른 여행 멤버가 캘린더에서 이벤트 보임 확인
- 스크린샷: 해당없음 (백엔드 동작 검증)

---

## V1 호환 검증

### Scenario V1-1: `/api/trips/<id>/gcal/status` 410 Gone 유지

spec 022(v2.10.0)에서 폐기된 라우트가 본 피처 후에도 410 Gone 유지. 응답 스키마 변경 0.

### Evidence

- 자동 테스트: `tests/api/gcal-legacy-gone.test.ts`
- 수동: 해당없음 (자동 테스트로 충분)
