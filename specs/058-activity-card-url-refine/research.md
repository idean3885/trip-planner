# Phase 0 Research: 058-activity-card-url-refine

## R1. 하단 여백 축소 + 캘린더 접힘 플립 방지

- **Decision**: 모바일 하단 패널 `min-h-[100svh]`를 줄이고(콘텐츠가 화면을 약간만 넘는 수준), `TripDetailLayout`의 스크롤 핸들러에 **클램프 가드**를 둔다 — 문서가 뷰포트보다 짧아 스크롤 불가일 때 브라우저가 만든 `scrollY≈0`을 "사용자가 최상단으로 올림"과 구분해 캘린더를 강제로 펼치지 않는다.
- **Rationale**: v3.17.1은 `100svh`로 "접힌 상태에서도 항상 스크롤 가능"을 보장해 플립을 막았으나 빈 여백이 과했다. 근본 원인은 "여백 크기"가 아니라 "스크롤 불가 시 클램프된 0을 사용자 의도로 오인"한 것. 가드를 넣으면 여백을 자유롭게 줄여도 플립이 없다.
- **Alternatives considered**: (a) 60svh 등 단순 축소 → 접힘 후 클램프 펼침 플립 재발(기각). (b) scroll-snap/GSAP 강제 보정 → 과거 7회 실패, 철회됨(기각). (c) 접힘을 탭 전용으로 → 스크롤 UX 후퇴(기각).

## R2. 메모 줄 제한

- **Decision**: 활동 카드 목록의 메모에 Tailwind `line-clamp-3` 적용. 상세 보기(spec 048 onView)는 클램프 없이 전문.
- **Rationale**: `line-clamp`는 추가 의존성 없는 CSS 표준(`-webkit-line-clamp`), 말줄임표 자동. 기존 `Linkify`는 유지(링크는 상세에서 클릭).
- **Alternatives**: JS 글자수 절단 → 줄 수 기준이 아니라 부정확(기각).

## R3. Activity.url 데이터·표현

- **Decision**: `Activity.url String?`(nullable) 추가. schema-only expand 마이그레이션. Zod 입력은 선택적 문자열(빈 문자열→null 정규화), 출력에 포함. MCP planner·OpenAPI 동기 반영. 표시는 값이 있을 때만 링크.
- **Rationale**: 기존 데이터 무영향(nullable 추가). 애플 캘린더 URL 필드와 1:1. 메모와 독립.
- **Alternatives**: memo에서 URL 파싱 이전 → 오분류 위험·검증 비용(사용자 기각). 별도 테이블 → 과설계(기각).

## R4. 폼 시작·종료 320px 겹침

- **Decision**: `ActivityForm`의 시작·종료 `grid grid-cols-2`를 좁은 폭에서 1열 스택, 일정 폭 이상에서 2열로 가는 반응형으로 변경(예: 기본 1열 + `min-[…]:grid-cols-2`).
- **Rationale**: 320px에서 datetime-local 2개를 가로로 두면 최소 폭을 못 맞춰 겹친다. 좁은 폭 스택이 표준 해법.
- **Alternatives**: 입력 폭 축소 → datetime-local 네이티브 위젯이라 한계(기각).

## R5. 가져오기 애플·구글 섹션 분리

- **Decision**: `ImportSection`을 provider별 제목이 붙은 두 영역으로 재구성(Apple / Google). 각 영역이 자기 연결·미연결·가져오기 목록을 자기 안에서 표시.
- **Rationale**: 현재 옆 작은 설명만으로 provider 구분이 약함. 제목 섹션으로 정보 구조를 분명히.
- **Alternatives**: 탭 전환 → 동시 비교 불가(기각).
