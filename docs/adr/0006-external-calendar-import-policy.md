# ADR 0006: 외부 캘린더 import 정책

- **Status**: Accepted (2026-05-27, v2.15.0)
- **Context**: Epic [#527](https://github.com/idean3885/trip-planner/issues/527), 마일스톤 [v2.15.0](https://github.com/idean3885/trip-planner/milestone/36)
- **Related**: ADR 0003 per-trip-shared-calendar (유지)

## Context

사용자가 trip-planner 밖 캘린더(Google·Apple)에 여행 일정을 이미 쌓아둔 경우, 그것을 다시 입력하지 않고 trip-planner Activity로 가져오고 싶다는 요구가 있다. 현재(v2.14.1)는 trip-planner가 만든 캘린더로의 단방향 push만 지원하므로, 외부에 있는 일정은 옮길 수단이 없다.

이 갭을 해소할 때 두 가지 큰 방향이 있다.

1. 사용자 외부 캘린더 자체를 trip의 캘린더로 사용(link).
2. 외부 캘린더에서 이벤트를 읽어 trip-planner Activity로 import.

## Decision

**(2) 방향만 채택한다.** 외부 캘린더는 데이터 원천으로만 쓰고, trip의 캘린더 정본은 ADR 0003(per-trip-shared-calendar) 모델 그대로 trip-planner가 만든 캘린더가 유지한다.

세부 결정:

- **외부 → 내부 단방향 import.** 양방향 sync는 본 ADR 범위 외.
- **사용자 수동 트리거.** 자동 polling·webhook 없음.
- **매핑 가능 필드만 자동 채움.** 외부 이벤트의 제목·시작·종료·장소 문자열·설명·종일 여부·timezone(있을 때)만 옮긴다.
- **매핑 불가 필드는 `ActivityDraft`로 분리 보관.** activity category, hotel·attraction 참조, reservation status, 명시 timezone은 사용자가 trip-planner UI에서 입력하기 전까지 비워둔다.
- **draft → 정식 Activity 승격은 사용자 명시 작업.** 승격 후에야 정식 Activity가 만들어지고 ADR 0003 push 경로에 합류한다.
- **멱등성.** `(provider, externalCalendarId, externalEventId)` 키로 중복 import를 차단한다. "다시 가져오기"는 사용자 명시 선택 시에만 매핑 가능 필드를 덮어쓰며, 매핑 불가 필드(사용자 입력)는 보존한다.
- **권한.** 외부 캘린더 import는 trip의 OWNER·HOST에게만 허용. GUEST는 403. 헌법 VI Permission Matrix에 행 추가.

## Why this shape

- **사용자 자산 보호.** 사용자가 본인 캘린더에 사적인 이벤트를 함께 둔 경우, 그 캘린더를 trip의 공유 캘린더로 사용하면 게스트에게 노출된다. 외부 캘린더는 절대 trip의 source of truth로 채택하지 않는다.
- **삭제 영역 분리.** trip 삭제 시 trip-planner는 자체 모델만 cascade로 정리하고, 사용자 외부 캘린더의 이벤트는 손대지 않는다. 외부 캘린더에서 사용자가 이벤트를 지워도 trip-planner draft는 사용자가 명시 작업할 때까지 그대로 유지된다.
- **승격 단계의 의도.** 외부 이벤트는 의미 필드를 안 가지므로 자동으로 정식 Activity로 만들면 잘못 매핑이 누적된다. draft에서 머무르다 사용자가 검토·승격하는 흐름이 데이터 품질을 지킨다.
- **멱등성으로 운영 안정.** 사용자가 import 버튼을 여러 번 눌러도, 외부 provider가 일시 오류로 재시도해도 draft가 중복 쌓이지 않는다.

## Rejected alternatives

1. **외부 캘린더 자체를 trip 캘린더로 link(안 A)** — 사용자 사적 이벤트 노출·삭제 위험. 사용자 자산을 trip-planner가 수정·삭제하게 되는 경계 문제. 기각.
2. **양방향 sync** — 외부 캘린더 변경의 자동 반영. webhook 채널 관리·삭제 race·conflict 정책이 복잡. 후속 마일스톤 별도 평가.
3. **AI 기반 자동 draft 필드 보강** — 외부 title·description에서 hotelId·attractionId·category를 추정. 정확도·비용·헌법 II Minimum Cost 위반. 별도 ADR 후 검토.

## Consequences

**Positive**:

- 사용자가 외부에 쌓아둔 일정을 trip-planner에 옮기는 경로가 생긴다.
- ADR 0003 모델·기존 push 경로 변경 0. 회귀 표면 작음.
- 멱등성으로 운영 안전(같은 import 반복 안전).

**Negative / Trade-offs**:

- 사용자가 draft 승격을 안 하면 정식 Activity 흐름과 단절된 상태가 누적될 수 있다. trip 삭제 시 cascade로 정리되므로 영구 고아는 없다.
- 외부 이벤트의 자유 텍스트(description)에 사적 내용이 있을 수 있어 import 시 그대로 draft에 들어간다. draft는 trip 멤버 ACL(OWNER·HOST·GUEST의 GUEST는 읽기 허용)에 따라 노출된다. 사용자에게 import 전 안내 문구로 고지한다.
- 양방향 sync 미지원이라 외부에서 수정·삭제한 변경은 사용자가 "다시 가져오기" 또는 draft 삭제로 명시 처리해야 한다.

## Permission Matrix (헌법 VI 갱신 항목)

| 행위 | OWNER | HOST | GUEST |
|------|-------|------|-------|
| 외부 캘린더 import | O | O | X |
| draft 승격(=Activity 생성) | O | O | X |
| draft "다시 가져오기" | O | O | X |
| draft 삭제 | O | O | X |

draft 조회는 trip 조회 권한에 흡수(GUEST 포함 멤버 전체 가능).

## Related

- Spec: [`specs/027-external-calendar-import/spec.md`](../../specs/027-external-calendar-import/spec.md)
- Plan: [`specs/027-external-calendar-import/plan.md`](../../specs/027-external-calendar-import/plan.md)
- Data Model: [`specs/027-external-calendar-import/data-model.md`](../../specs/027-external-calendar-import/data-model.md)
- ADR 0003 per-trip-shared-calendar — 유지
