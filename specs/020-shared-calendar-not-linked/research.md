# Research — 020 공유 캘린더 미연결 상태의 역할별 UI

**Created**: 2026-04-22
**Scope**: plan.md Phase 0 산출물. 모든 NEEDS CLARIFICATION 해소.

## Decision 1 — status 응답 형식에 역할별 힌트를 추가하지 않는다

- **Decision**: `GET /api/trips/[id]/gcal/status`의 `linked:false` 응답은 기존대로 `{ linked: false, scopeGranted: boolean }`만 둔다. `ownerHasLinked`·`userCanLink` 등 역할 의존 플래그를 추가하지 않는다.
- **Rationale**: 역할 판단은 UI 컴포넌트(`GCalLinkPanel`)가 이미 `role` prop으로 가진다. 응답에 역할 의존 플래그를 넣으면 (a) 권한 표면이 넓어지고 (b) CDN/HTTP 캐시 정책이 역할별로 분기해야 하는 부담이 생긴다. 본 피처의 본질은 **서버 응답 단순화**이고, UI 분기는 클라이언트 책임으로 남긴다.
- **Alternatives considered**:
  - (a) `{ linked: false, ownerHasLinked: false }` — 호스트·게스트가 주인의 미연결을 명시 확인. 쓰임새는 "주인이 곧 연결할 수 있음"을 UI 힌트로 주는 것이나, 본 피처는 그 힌트를 제공하지 않기로 결정(FR-008, Clarification 2).
  - (b) 별도 `/mystate` 엔드포인트 — 같은 데이터를 역할별 투사로 분화. 엔드포인트 수 증가 대비 이익 없음.

## Decision 2 — status 응답에 레거시 감지 힌트(`legacy`)를 포함하지 않는다

- **Decision**: `TripCalendarLink` 부재 상태에서 호출자의 per-user `GCalLink` 존재 여부를 응답에 노출하지 않는다.
- **Rationale**: 본 피처의 범위는 "미연결 상태 UI" 자체이고, 레거시 링크 존재는 UI 분기를 만들지 않는다(Clarification 2). PR #394에서 `legacy: "needs_owner_relink"` 힌트를 시도했으나 "레거시/마이그레이션 버그" 프레이밍이 잘못된 방향임이 확인되어 폐기.
- **Alternatives considered**:
  - (a) `{ legacy: true }` 힌트 + 주인 "업그레이드" 다이얼로그 — 폐기(spec 020 배경 섹션 참조).
  - (b) 레거시 감지를 관찰 로그에만 남김 — 본 피처의 Non-Goal에 포함된 "레거시 정리"의 일부이므로 본 피처에 싣지 않는다.

## Decision 3 — 다이얼로그 UI는 기존 컴포넌트 구조를 공유한다

- **Decision**: `GCalLinkPanel.tsx` 단일 파일 안에서 `role` + `status.linked` 조합으로 분기한다. Dialog/DialogTrigger/DialogContent는 shadcn 공통 컴포넌트를 계속 사용하고, **비-주인 미연결 분기에서는 내부 콘텐츠만** "안내문 + 닫기 버튼"으로 교체한다.
- **Rationale**:
  - 주인 트리거(outline 버튼, size=sm, 좌측 Calendar 아이콘)와 비-주인 트리거가 시각·레이아웃상 **동일 위치·크기**여야 한다는 Clarification Session 2026-04-22 결정을 가장 단순하게 충족.
  - 별도 `GCalNotLinkedPanel.tsx`로 복제하면 주인 분기와 동기화 부담이 생긴다.
- **Alternatives considered**:
  - (a) 별도 파일 `GCalNotLinkedPanel.tsx` — 분기 중복. 기각.
  - (b) 트리거만 렌더하고 Dialog는 렌더하지 않음(토스트로 안내) — "동일 위치·크기 트리거 + 다이얼로그 진입" 요구와 불일치. 기각.

## Decision 4 — 모바일 가시성 확인은 DevTools device mode 수동 점검

- **Decision**: quickstart의 Evidence 섹션에 "Safari iPhone 13 / Chrome Pixel 6 device mode에서 트리거·다이얼로그 가로 스크롤 없음" 항목을 포함한다. Playwright/Cypress 기반 자동화는 도입하지 않는다.
- **Rationale**: 프로젝트에 E2E 브라우저 자동화 런타임이 없다. 본 피처 한 건을 위해 Playwright 도입은 과도한 비용(Minimum Cost 원칙). shadcn Dialog는 이미 모바일 반응형으로 검증된 컴포넌트라 리스크 낮음.
- **Alternatives considered**:
  - (a) Playwright 도입 + 본 피처 테스트만 스모크 — 유지 비용·CI 시간 증가. 기각.
  - (b) BrowserStack/외부 장비 수동 — 비용 초과(무료 티어 외). 기각.

## Decision 5 — 역할 용어 정비는 본 피처 산출물 범위에 포함한다

- **Decision**: `docs/glossary.md`를 본 피처의 산출물로 남기고, spec/plan/tasks 및 본 피처가 편집하는 코드 주석·에러 메시지에서 "오너" → "주인"으로 정본화한다. 기존 릴리즈된 스펙(019 등)은 소급 교체하지 않는다(glossary 사용 원칙 5).
- **Rationale**:
  - 본 피처의 스펙 작성 중 "오너/주인" 혼용이 실제 혼선으로 드러났다.
  - 정본 문서 1개로 이후 모든 스펙·PR이 참조하도록 정착시키는 편이 비용 효율적.
- **Alternatives considered**:
  - (a) glossary를 별도 피처로 분리 — specify 도중 발견된 정본 결손을 후순위로 미루면 본 피처 내에서도 다시 혼용될 위험. 기각.
  - (b) spec 019까지 소급 일괄 교체 — 릴리즈 완료 문서를 손대는 비용·risk 대비 이익 낮음. 기각.

## Open Questions

없음. Phase 1로 진행 가능.
