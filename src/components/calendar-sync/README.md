# calendar-sync

spec 028 (v2.16.0) — trip 상세의 캘린더 관련 모든 동선을 단일 진입 카드 + 단일 다이얼로그로 통합.

## 구조

- `CalendarSyncEntryCard.tsx` — SidePanel에 노출되는 진입 카드.
- `CalendarSyncDialog.tsx` — 카드 클릭 시 열리는 다이얼로그 컨테이너. URL query(`?calsync=open`)로도 오픈.
- `sections/`
  - `ProviderSection.tsx` — provider 선택·연결 상태(spec 019/020·025 기능 흡수).
  - `ImportSection.tsx` — 외부 캘린더 import(spec 027 + v2.15.1 진단 흡수).
  - `DraftSection.tsx` — draft 목록·승격·refresh·삭제(spec 027 흡수).
- `PromoteForm.tsx` — draft 승격 inline 폼.
- `hooks/` — API 호출 hook들.

## 정책

- depth 0: 다이얼로그 안에서 모든 동선 처리. 새 페이지·서브 모달 안 만든다(기존 sub-dialog는 inline expand 또는 제거).
- 도메인 호출은 v2.15.x 엔드포인트 재사용. 새 API 추가 없음.
- 5개 기존 패널(`CalendarProviderChoice`·`GCalLinkPanel`·`AppleEntryCard`·`CalendarImportPanel`·`DraftListPanel`)은 v2.16.0에서 deprecated, 후속 v2.16.x 에서 제거.

ADR·spec: docs/adr/, specs/028-calendar-sync-dialog/
