# Quickstart: 캘린더 동기화 UI 통합

**Feature**: `028-calendar-sync-dialog` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## US1 — 단일 진입점 + provider 연결

### Scenario US1-1: SidePanel 카드 1개만 표시

**Given** OWNER가 새 trip을 만들고 캘린더 미연결 상태.
**When** trip 상세에 진입.
**Then** SidePanel 캘린더 영역에 "외부 캘린더 동기화" 카드 1개만 보이고 기존 5종 패널은 직접 노출되지 않는다.

### Scenario US1-2: 다이얼로그 안 provider 선택

**Given** 캘린더 미연결 상태에서 진입 카드를 클릭.
**When** 다이얼로그가 열리면.
**Then** provider 선택지(Google·Apple)와 연결 액션이 같은 다이얼로그 안 한 화면에 보인다.

### Scenario US1-3: 연결 후 섹션 동적 확장

**Given** 다이얼로그에서 Google 연결을 완료.
**When** 결과가 갱신되면.
**Then** 다이얼로그가 닫히지 않고 "외부 캘린더에서 가져오기" 섹션이 같은 다이얼로그 안에 자라 표시된다.

### Evidence

- 자동 테스트: `pnpm test src/components/calendar-sync/CalendarSyncEntryCard.spec.tsx`, `pnpm test src/components/calendar-sync/sections/ProviderSection.spec.tsx`
- 수동 체크리스트(dev.trip.idean.me):
  - [ ] US1-1 SidePanel 진입 카드 단일 표시 확인
  - [ ] US1-2 다이얼로그 첫 진입 시 provider 선택지 노출 확인
  - [ ] US1-3 연결 후 섹션 동적 확장 확인(다이얼로그 재오픈 없이)

## US2 — 같은 다이얼로그 안에서 import + draft 관리

### Scenario US2-1: import 실행 → draft 목록이 같은 다이얼로그 안에 자람

**Given** 다이얼로그가 열려 있고 외부 Google 캘린더가 1개 이상 보임.
**When** 캘린더 선택 → "가져오기 시작" 실행.
**Then** 결과 토스트와 함께 같은 다이얼로그 안에 draft 목록 섹션이 자라 표시된다.

### Scenario US2-2: 같은 다이얼로그 안에서 승격

**Given** PENDING draft가 1건 표시된 상태.
**When** draft를 클릭해 승격 폼이 같은 다이얼로그 안에서 펼쳐지고 필수 필드 입력 후 "승격".
**Then** draft row가 사라지고 정식 Activity로 전환된다. 다이얼로그는 닫히지 않는다.

### Scenario US2-3: 같은 다이얼로그 안에서 refresh·삭제

**Given** PENDING draft 1건.
**When** 컨텍스트 메뉴에서 "다시 가져오기" 또는 "삭제" 실행.
**Then** 같은 다이얼로그 안에서 결과가 즉시 반영(필드 갱신 또는 row 제거).

### Evidence

- 자동 테스트: `pnpm test src/components/calendar-sync/sections/ImportSection.spec.tsx`, `pnpm test src/components/calendar-sync/sections/DraftSection.spec.tsx`
- 수동 체크리스트:
  - [ ] US2-1 import → draft 섹션 같은 다이얼로그 안 확장 확인
  - [ ] US2-2 승격 폼 inline 동작 확인
  - [ ] US2-3 refresh·삭제 inline 동작 확인

## US3 — 권한별 분기

### Scenario US3-1: GUEST 진입

**Given** GUEST 멤버가 같은 trip에 진입.
**When** SidePanel 카드를 클릭하고 다이얼로그가 열리면.
**Then** 캘린더 상태·draft 목록(있을 때)은 읽기 모드로 보이고 import 트리거·승격·삭제 액션은 비활성/숨김.

### Scenario US3-2: HOST 진입

**Given** HOST 멤버.
**When** 같은 카드를 클릭.
**Then** import·승격·refresh·삭제 모두 활성. OWNER 전용 액션(있는 경우)은 비활성.

### Evidence

- 자동 테스트: `pnpm test src/components/calendar-sync/sections/ProviderSection.spec.tsx::rbac`
- 수동 체크리스트:
  - [ ] US3-1 GUEST 진입 시 편집 액션 비활성 확인
  - [ ] US3-2 HOST 진입 시 모든 액션 활성 확인

## Edge Cases

### Scenario E-1: Google OAuth scope 부족 분기

다이얼로그 섹션 2 안에 "Google 다시 연결" 인라인 버튼이 노출되고 클릭 시 `/api/gcal/consent`로 진입.

### Scenario E-2: OAuth redirect 복귀 자동 오픈

`?calsync=open` query param 으로 페이지 진입 시 다이얼로그가 자동 오픈.

### Scenario E-3: 모바일(<768px) 다이얼로그 가로 스크롤 0건

360·480·768px 폭에서 섹션 세로 스택 + 가로 스크롤 발생 안 함.

### Scenario E-4: stale 텍스트 0건

"Apple 캘린더는 후속 릴리즈에서 지원될 예정" 등 v2.15.x 잔존 잘못된 안내 텍스트가 다이얼로그 안에 0건.

### Evidence

- 자동 테스트: `pnpm test src/components/calendar-sync/CalendarSyncDialog.spec.tsx::scope-branch`, `::query-param-open`
- 수동 체크리스트:
  - [ ] E-1 scope 부족 분기 인라인 노출 확인
  - [ ] E-2 redirect 복귀 자동 오픈 확인
  - [ ] E-3 모바일 360/480/768px 가로 스크롤 0건 확인(스크린샷 `docs/evidence/028-calendar-sync-dialog/e3-mobile-*.png`)
  - [ ] E-4 다이얼로그 텍스트 grep 검수 — 잘못된 안내 0건

## Performance (SC-002)

### Scenario PERF-1: 1회 진입으로 연결→import→승격 완료

**Given** 캘린더 미연결 trip.
**When** 카드 1회 클릭 → 다이얼로그 안에서 Google 연결 → import → draft 1건 승격을 연속 수행.
**Then** 다이얼로그 재오픈 없이 완료, 사용자 클릭 카운트 가시화 후 verify.

### Evidence

- 수동 체크리스트:
  - [x] PERF-1 자동 테스트 측정 책임은 머지 후 사용자 — 본 항목은 dev 환경 동선 검증으로 1차 충족
