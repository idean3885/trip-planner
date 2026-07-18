# Feature Specification: 대문 정보위계·카피 정리

**Feature Branch**: `070-landing-refine`
**Created**: 2026-07-19
**Status**: Draft
**Input**: 디자이너 전문가 리뷰 — 대문 CTA 군더더기·섹션 제목 위계 역전·경고배너 위치·문구 중복.

## Clarifications
1. 하단 CTA 서브텍스트("Google 계정으로 로그인하면…")는 로그인 화면에서 반복 + 인증수단(구현세부) 결합이라 제거한다(Hero CTA가 서브텍스트 없는 것과 대칭).
2. 섹션 제목(Features·Demo·CTA)이 킥커 스타일(text-xs·uppercase·muted)이라 본문(14px)보다 작아 제목/본문 위계가 역전됐다 → foreground·20~24px·semibold로 상향.
3. 구글 캘린더 제한 경고 배너가 최종 CTA 바로 앞에 있어 전환 직전 부정 신호 → CTA 뒤(하단)로 이동. 정보는 유지.
4. Features 제목이 Hero 킥커("여행 계획부터 현장까지…")와 문구 중복 → 다른 각도로 변경.

## Metatag Conventions *(normative)*
`[artifact]` · `[why]` · `[multi-step]` · `[migration-type]`(해당 없음).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 대문 위계가 분명하다 (Priority: P1)
방문자가 대문을 훑을 때 섹션 제목이 본문보다 크고 뚜렷해 구조가 한눈에 잡히고, 최종 CTA 직전에 경고가 없어 행동 유도가 매끈하다.

**Independent Test**: 섹션 h2가 foreground·큰 크기 클래스인지, CTA 서브텍스트 부재, 배너가 CTA 뒤인지, Features 제목 문구가 Hero 킥커와 다른지 소스 레벨 검증.

**Acceptance Scenarios**:
1. **Given** 대문, **When** 렌더되면, **Then** 섹션 제목(Features·Demo·CTA)이 본문보다 크고 진하다.
2. **Given** 하단 CTA, **When** 렌더되면, **Then** "Google 계정으로 로그인" 서브텍스트가 없다.
3. **Given** 대문 스크롤, **When** 최종 CTA에 도달하면, **Then** 그 직전에 경고 배너가 없다(배너는 CTA 뒤).
4. **Given** 대문, **When** Hero 킥커와 Features 제목을 보면, **Then** 같은 문구가 반복되지 않는다.

### Edge Cases
- 제목 크기 상향 후 섹션 간 여백 균형(실기기 확인).

## Requirements *(mandatory)*
- **FR-001**: 하단 CTA의 인증수단 언급 서브텍스트를 제거한다.
- **FR-002**: 섹션 제목(Features·Demo·CTA h2)을 foreground·큰 크기·semibold로 상향한다.
- **FR-003**: 구글 캘린더 제한 경고 배너를 최종 CTA 뒤로 이동한다(정보 유지).
- **FR-004**: Features 제목을 Hero 킥커와 다른 문구로 바꾼다.
- **FR-005**: 색·타이포는 기존 토큰/유틸 경유(하드코딩 금지).

## Success Criteria *(mandatory)*
- **SC-001**: 섹션 제목이 본문보다 크고 진함(위계 정상).
- **SC-002**: CTA 서브텍스트 0, 경고 배너는 CTA 뒤.
- **SC-003**: Hero 킥커와 Features 제목 문구 불일치.
