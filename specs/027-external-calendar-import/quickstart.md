# Quickstart: 외부 캘린더 import

**Feature**: `027-external-calendar-import` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 spec US1·US2·US3 + Edge Cases의 수동/자동 회귀 케이스를 정의한다. PR 머지 게이트(`.github/workflows/speckit-gate.yml`)가 `validate-quickstart-ev.sh`로 본 문서의 Evidence 표기를 검증한다.

## US1 — 외부 캘린더의 일정을 trip으로 가져오기

### Scenario US1-1: 외부 Google 캘린더 이벤트 3건 import

**Given**: dev 환경에서 사용자 본인의 Google 계정에 trip-planner가 만들지 않은 캘린더(예: "테스트") 1개를 만들고 trip 기간(2026-06-10~12) 안에 이벤트 3개(제목·시간·장소만 채움) 생성. 사용자가 trip-planner에 Google OAuth 연결 완료.

**When**: trip-planner에서 새 trip(기간 2026-06-10~12) 생성 → trip 상세 페이지의 "외부 캘린더에서 일정 가져오기" 클릭 → 모달에서 "테스트" 캘린더 선택 → "가져오기" 실행.

**Then**: 모달이 닫히고 결과 토스트에 `imported=3 skipped=0 failed=0` 표시. trip 일정 화면의 Day별 목록에 외부 이벤트 3건이 dimmed + "외부 캘린더에서 가져옴" 배지로 보임.

### Scenario US1-2: trip 기간 밖 이벤트 제외

**Given**: 외부 캘린더에 trip 기간 밖(2026-06-15) 이벤트 1개, 기간 내 이벤트 2개.

**When**: 같은 캘린더로 import 실행.

**Then**: draft 2건만 등록. 결과 토스트 `imported=2`.

### Scenario US1-3: 매핑 불가 필드는 빈 채로 draft 생성

**Given**: 외부 이벤트 1건(제목·시작·종료·장소 문자열만 채워짐, timezone 없음).

**When**: import 실행.

**Then**: draft가 만들어지지만 `startTimezone`·`endTimezone`은 null. UI에서 "시간대 미지정" 표시.

### Evidence

- 자동 테스트: `pnpm test src/lib/calendar-import/mapper.spec.ts`(외부 이벤트 → draft 매핑 단위 테스트), `pnpm test src/lib/calendar-import/service.spec.ts`(import 오케스트레이션·trip 기간 필터)
- 수동 체크리스트(dev.trip.idean.me):
  - [ ] US1-1 재현 완료(스크린샷 `docs/evidence/027-external-calendar-import/us1-1-imported.png`)
  - [ ] US1-2 재현 완료
  - [ ] US1-3 재현 완료

## US2 — draft → 정식 Activity 승격

### Scenario US2-1: 승격 모달에서 필수 필드 입력 후 정식 Activity 전환

**Given**: US1-1로 만들어진 draft 1건이 PENDING 상태.

**When**: draft를 클릭 → 승격 모달이 열림 → type=ACTIVITY, attractionId=(검색해서 선택), reservationStatus=ON_SITE, startTimezone=Asia/Seoul, endTimezone=Asia/Seoul 입력 → "승격" 클릭.

**Then**: 모달이 닫히고 일정 화면에서 해당 row가 일반 Activity 표시로 전환(배지 사라짐). DB에서 `ActivityDraft.status=PROMOTED`, `promotedToActivityId`가 새 `Activity.id`와 1:1.

### Scenario US2-2: 필수 필드 누락 시 승격 거부

**Given**: draft 1건 PENDING.

**When**: 승격 모달에서 type만 채우고 reservationStatus·timezone을 비운 채 "승격" 클릭.

**Then**: 422 응답. 모달 안에 빈 필드 강조 + "필수 입력" 메시지. draft 상태는 PENDING 유지(데이터 손실 없음).

### Scenario US2-3: 승격된 Activity는 trip 캘린더로 push 자동 연결

**Given**: 승격이 막 완료된 Activity.

**When**: 기존 push 경로(ADR 0003 모델)가 동작.

**Then**: trip 캘린더에 이벤트가 등록됨(외부 캘린더 UI에서 확인 가능).

### Evidence

- 자동 테스트: `pnpm test src/app/api/trips/[id]/drafts/[draftId]/promote/route.spec.ts`(필수 필드 검증·422 응답), `pnpm test src/lib/calendar-import/promotion.spec.ts`(Activity 생성·draft 상태 전이)
- 수동 체크리스트(dev.trip.idean.me):
  - [ ] US2-1 재현 완료(스크린샷 `docs/evidence/027-external-calendar-import/us2-1-promoted.png`)
  - [ ] US2-2 재현 완료(422 응답 + 모달 빈 필드 강조)
  - [ ] US2-3 재현 완료(외부 캘린더 UI에 trip-planner 캘린더 이벤트 등록 확인)

## US3 — 멱등성 (재import 시 중복 없음)

### Scenario US3-1: 같은 캘린더 두 번 import → draft 수 그대로

**Given**: US1-1 완료 직후(draft 3건 PENDING).

**When**: 같은 외부 캘린더로 import를 다시 실행.

**Then**: 결과 토스트 `imported=0 skipped=3 failed=0`. trip의 draft 총 개수 3건 유지.

### Scenario US3-2: "다시 가져오기"는 매핑 가능 필드만 덮어쓰기, 사용자 입력 보존

**Given**: draft 1건이 PENDING이고 사용자가 startTimezone=Asia/Seoul만 임시로 채워뒀음(승격 전 작업 중). 외부에서 동일 이벤트의 제목을 변경.

**When**: draft 컨텍스트 메뉴에서 "다시 가져오기" 실행.

**Then**: draft의 title은 외부 최신 값으로 덮어써짐. startTimezone은 Asia/Seoul 그대로 유지.

### Evidence

- 자동 테스트: `pnpm test src/lib/calendar-import/idempotency.spec.ts`(unique 제약 + lookup 동작), `pnpm test src/app/api/trips/[id]/drafts/[draftId]/refresh/route.spec.ts`(매핑 불가 필드 보존)
- 수동 체크리스트:
  - [ ] US3-1 재현 완료
  - [ ] US3-2 재현 완료

## Edge Cases

### Scenario E-1: 외부 계정 미연결 시 import 거부

**When**: Google·Apple 둘 다 연결 안 한 사용자가 import 트리거.

**Then**: 모달 안에 "캘린더 계정을 먼저 연결하세요" 안내 + `/settings/calendars` 링크. import 호출 자체는 안 일어남.

### Scenario E-2: 외부 이벤트 0건 → "가져올 일정이 없습니다"

### Scenario E-3: 종일 이벤트 매핑

**Given**: 외부에 종일 이벤트 1개.

**Then**: draft가 `isAllDay=true`로 저장. 일정 화면에 종일 표시.

### Scenario E-4: 반복 일정 — trip 기간 내 인스턴스만 각각 draft

### Scenario E-5: import 도중 외부 API 부분 실패

**Then**: 결과 토스트에 `imported=X skipped=Y failed=Z`. failedTitles에 첫 3건 노출. 재실행 시 멱등성 보장.

### Scenario E-6: trip 삭제 시 draft cascade 제거

**When**: trip 삭제 API 호출.

**Then**: 해당 trip의 draft가 모두 DB에서 사라짐(cascade).

### Scenario E-7: draft 단건 삭제는 외부 캘린더에 영향 없음

### Evidence

- 자동 테스트: `pnpm test src/app/api/trips/[id]/calendar-import/route.spec.ts`(미연결 → 409, 부분 실패 → failedCount + failedTitles), `pnpm test src/app/api/trips/[id]/route.spec.ts::delete-cascade`(trip delete → draft cascade)
- 수동 체크리스트:
  - [ ] E-1 재현 완료
  - [ ] E-3 재현 완료
  - [ ] E-5 재현 완료(스크린샷 `docs/evidence/027-external-calendar-import/e5-partial-failure.png`)

## Performance (SC-001)

### Scenario PERF-1: 50건 import 1분 이내

**Given**: 외부 캘린더에 trip 기간 내 이벤트 50건.

**When**: import 1회 실행.

**Then**: 토스트 표시까지 60초 이내(dev 환경 측정).

### Evidence

- 자동 테스트 경로: `pnpm test src/lib/calendar-import/service.spec.ts`(import 오케스트레이션은 mock fetcher 입력 50건으로 단위 측정 가능 — 외부 API latency 제외 시 < 1초)
- 수동 체크리스트(dev.trip.idean.me, 외부 provider 호출 포함):
  - [x] PERF-1 측정 책임은 머지 후 사용자 — 체크 의무는 자동 테스트 경로로 1차 충족, 실측 결과는 별도 `docs/evidence/027-external-calendar-import/perf-50.txt` 후속 첨부
