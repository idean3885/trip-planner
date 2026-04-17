# Feature Specification: speckit 파이프라인 강제 + 커스텀 + drift 방지

**Feature Branch**: `010-speckit-harness`
**Created**: 2026-04-17
**Status**: Draft
**Input**: GitHub 이슈 #181 (근거 회고: #191 — 004 tasks.md 49/53 미체크 상태로 프로덕션 운용, plan #12 "HOST→OWNER 보정"이 tasks에 미매핑되어 데이터 마이그레이션 누락 배포)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - plan ↔ tasks 커버리지 검증 (Priority: P1)

개발자가 tasks 단계에서 산출물을 확정할 때, plan.md의 각 계획 항목이 tasks.md의 실행 단위에 최소 1건 매핑되어 있는지 시스템이 자동 검증한다. 누락된 plan 항목이 있으면 tasks 확정이 차단되고, 어느 항목이 비는지 리포트가 출력된다.

**Why this priority**: #191 회고의 핵심 실패 지점. plan의 "HOST 데이터 OWNER 보정" 항목이 tasks로 전사되지 않아 스키마만 바뀌고 데이터 마이그레이션이 누락된 채 배포됨. 사람이 보장하던 연결 고리를 시스템이 강제하지 않으면 같은 유형의 사고가 반복된다.

**Independent Test**: plan.md에 3개 bullet을 두고 tasks.md에 2개만 매핑한 상태에서 tasks 확정을 시도하면 차단되고, 누락된 3번째 bullet이 리포트되는지 확인.

**Acceptance Scenarios**:

1. **Given** plan.md의 모든 계획 항목이 tasks.md의 한 개 이상 태스크에 매핑되어 있고, **When** tasks 단계 확정이 실행되면, **Then** 통과한다.
2. **Given** plan.md의 계획 항목 하나가 tasks.md에 매핑되지 않은 상태에서, **When** tasks 단계 확정이 실행되면, **Then** 차단되고 누락된 plan 항목이 사용자에게 제시된다.
3. **Given** 한 plan 항목이 다단 작업(예: 스키마 변경 + 데이터 보정)을 내포한 경우, **When** 그 plan 항목이 단일 태스크로만 매핑되어 있으면, **Then** "명시적 분해 필요" 경고를 출력하고 확정을 차단한다.

---

### User Story 2 - tasks ↔ artifact 일치성 drift 감사 (Priority: P1)

PR 단계에서 tasks.md의 체크박스 상태와 실제 레포 아티팩트(파일·경로·컴포넌트 등 태스크가 선언한 산출물) 일치 여부를 교차 검증한다. 불일치가 발견되면 등급에 따라 에러 또는 경고로 리포트되어, tasks.md가 현실과 분리되는 fiction 상태로 배포되는 것을 차단한다.

**Why this priority**: #191의 두 번째 실패 지점. 004 tasks.md가 49/53 미체크인 채로 운용 중이었으며, 어떤 태스크가 실제로 완료됐는지 문서에서 확인할 방법이 없었다. drift가 장기 누적되면 tasks 산출물이 사실상 소설이 된다.

**Independent Test**: tasks.md 임의 항목을 체크했는데 선언된 파일 경로가 레포에 없으면 에러, 미체크 상태인데 파일이 존재하면 경고가 나오는지 확인.

**Acceptance Scenarios**:

1. **Given** tasks.md의 체크된 태스크가 선언한 아티팩트가 레포에 존재하고, **When** drift 감사가 실행되면, **Then** 통과한다.
2. **Given** tasks.md에서 체크된 태스크의 아티팩트가 레포에 없으면, **When** drift 감사가 실행되면, **Then** 에러로 차단된다.
3. **Given** tasks.md에서 미체크 상태인 태스크의 아티팩트가 이미 존재하면, **When** drift 감사가 실행되면, **Then** 경고로 리포트된다(차단은 아님).
4. **Given** drift 감사가 주기적으로 수행되면, **When** 설정된 주기(예: 주 1회)가 도래하면, **Then** 전체 활성 피처의 감사 리포트가 생성된다.

---

### User Story 3 - quickstart 실행 증명 게이트 (Priority: P1)

구현 완료를 선언하려면 quickstart 시나리오별 실행 증거(자동 테스트 커밋 또는 수동 검증 체크리스트 + 스크린샷)가 첨부되어 있어야 한다. 증거 없이 PR을 머지할 수 없다.

**Why this priority**: #191에서 T036/T047(삭제·합류·나가기 플로우)이 미체크인 채 배포됨. 실행 증명이 없으면 "구현은 됐지만 동작은 미확인" 상태가 유지된다.

**Independent Test**: quickstart에 3개 시나리오를 두고 2개만 증거 제시한 PR 생성 시 머지 게이트가 실패하는지 확인.

**Acceptance Scenarios**:

1. **Given** quickstart의 모든 시나리오에 자동 테스트 커밋 또는 수동 검증 체크리스트가 연결되어 있으면, **When** 머지 게이트가 실행되면, **Then** 통과한다.
2. **Given** quickstart 시나리오 하나가 실행 증거 없이 PR이 열리면, **When** 머지 게이트가 실행되면, **Then** 차단되고 증거 미제출 시나리오가 리포트된다.
3. **Given** 수동 검증 경로를 선택한 시나리오가, **When** 체크리스트 또는 스크린샷 중 하나라도 누락되면, **Then** 차단된다.

---

### User Story 4 - expand-and-contract 데이터 보정 강제 (Priority: P1)

DB 스키마(열·테이블) 또는 enum 값 추가가 plan에 포함된 경우, 기존 데이터 보정·기본값 지정 태스크가 tasks.md에 반드시 존재해야 한다. 마이그레이션 산출물은 "스키마 전용" 또는 "데이터 마이그레이션 포함" 중 하나로 구분 메타데이터가 요구된다.

**Why this priority**: #191의 근본 원인. `add_owner_role` 마이그레이션이 enum 값만 추가하고 기존 HOST 중 생성자를 OWNER로 올리는 데이터 마이그레이션이 누락되어, 프로덕션에서 권한 매트릭스가 제대로 동작하지 않는 기간이 발생했다.

**Independent Test**: plan에 "enum 값 추가" 항목을 두고 tasks에 데이터 보정 태스크 없이 tasks 확정을 시도하면 차단되는지 확인.

**Acceptance Scenarios**:

1. **Given** plan에 스키마 또는 enum 확장이 명시되어 있고, **When** tasks.md에 대응 데이터 보정 태스크가 존재하면, **Then** 통과한다.
2. **Given** plan에 스키마 또는 enum 확장이 명시되어 있고, **When** tasks.md에 데이터 보정 태스크가 없으면, **Then** 차단되고 필요한 보정 태스크 유형이 제시된다.
3. **Given** 마이그레이션 산출물이 추가되면, **When** 구분 메타데이터가 누락되어 있으면, **Then** 차단되고 "schema-only" 또는 "data-migration" 중 하나를 지정하도록 요구한다.

---

### User Story 5 - 파이프라인 순서 강제 (Priority: P2)

speckit 단계는 specify → clarify → plan → tasks → implement 순서를 따라야 하며, 선행 산출물 없이 후행 단계를 실행할 수 없다. 사용자가 순서를 건너뛰려 하면 시스템이 차단하고 누락 단계를 안내한다.

**Why this priority**: 기존 하네스가 존재하나 산출물 존재 확인에 머물러 있다. 순서 강제를 명시적으로 세우지 않으면 P1 게이트들(커버리지·drift·QS·expand-contract)이 우회된다.

**Independent Test**: spec.md 없는 피처 디렉토리에서 plan 실행을 시도하면 차단되는지, plan.md 없이 tasks 실행을 시도하면 차단되는지 확인.

**Acceptance Scenarios**:

1. **Given** spec.md가 없는 피처 디렉토리에서, **When** plan 단계가 실행되면, **Then** 차단되고 specify 실행을 안내한다.
2. **Given** plan.md가 없는 상태에서, **When** tasks 단계가 실행되면, **Then** 차단된다.
3. **Given** tasks.md가 없는 상태에서, **When** implement 단계의 소스 편집이 시도되면, **Then** 차단된다.
4. **Given** 피처 디렉토리가 카테고리 하위(예: `_infra/NNN-*`)에 있는 경우에도, **When** 위 순서 검증이 실행되면, **Then** 평면 구조(`specs/NNN-*`)와 동일하게 동작한다.

---

### User Story 6 - implement 커스텀 템플릿 (Priority: P3)

implement 단계가 프로젝트 컨벤션을 반영하여 동작한다: 레이어 분리(도메인 → 애플리케이션 → 인프라 → 표현), 테스트 패턴(프론트/백엔드 각각), 커밋 규칙(Git Flow Lite), breaking change 검증(DB 스키마 변경 시 expand-and-contract 규칙 재확인).

**Why this priority**: 기본 implement가 너무 범용이라 프로젝트 실정에 맞는 산출물이 자동 생성되지 않는다. 생산성 개선 성격이며 P1~P2 없이는 안전성 효과가 제한적이라 후순위.

**Independent Test**: implement 실행 시 DDD 레이어 구조 체크리스트와 테스트 전략 질문이 프롬프트에 포함되는지 확인.

**Acceptance Scenarios**:

1. **Given** implement가 실행되면, **When** 레이어 배치가 요구되면, **Then** 템플릿이 해당 컨벤션(도메인/애플리케이션/인프라/표현)을 명시적으로 제시한다.
2. **Given** DB 스키마 변경이 plan에 포함된 경우, **When** implement가 실행되면, **Then** expand-and-contract 재확인 질의가 반드시 포함된다.

---

### User Story 7 - tasks → 이슈 합산 + 8h 제한 + 마일스톤 (Priority: P3)

tasks.md를 GitHub 이슈로 전사할 때, "왜(Why)"가 같은 태스크는 하나의 이슈로 합쳐지고 "무엇(What)"은 유연하게 묶인다. 이슈당 예상 공수 상한(8h)을 초과하면 분할하며, 결과 이슈가 2개 이상이면 마일스톤이 자동 생성된다.

**Why this priority**: 이슈 파편화 방지 및 마일스톤 관리 부담 제거. P1~P2가 정착된 후 운영 편의로 도입해도 안전성에 영향이 없다.

**Independent Test**: 동일 Why를 가진 태스크 3개를 두고 전사를 실행하면 1개 이슈로 합쳐지는지, 총 추정치가 8h를 넘으면 분할되는지 확인.

**Acceptance Scenarios**:

1. **Given** Why가 동일한 태스크 묶음이 있고, **When** 이슈 전사가 실행되면, **Then** 하나의 이슈로 합산된다.
2. **Given** 합산된 이슈 추정치가 8h를 초과하면, **When** 전사가 실행되면, **Then** 이슈가 분할된다.
3. **Given** 최종 생성 이슈가 2개 이상이고, **When** 전사가 실행되면, **Then** 해당 피처 명칭으로 마일스톤이 자동 생성되고 이슈가 연결된다.
4. **Given** 이슈가 1개인 경우, **When** 전사가 실행되면, **Then** 마일스톤을 생성하지 않는다(프로젝트 메모리의 "마일스톤 선택적 사용" 원칙).

---

### User Story 8 - 헌법 V·VI 자동 검증 연동 (Priority: P3)

specify 및 clarify 단계에서 헌법 제V조(도메인 경계), 제VI조(역할 기반 권한)의 위반 가능성을 자동 스캔한다. 위반 가능 항목이 있으면 경고와 함께 수정 유도 질문을 출력한다.

**Why this priority**: 현재는 헌법을 사람이 수동 확인한다. 자동화 효과는 있지만 실패 사례가 아직 누적되지 않아 시급도는 낮음.

**Independent Test**: 스펙 본문에 "동행 협업이 Activity를 직접 수정"과 같은 도메인 위반 표현이 있을 때, specify 검증이 경고를 출력하는지 확인.

**Acceptance Scenarios**:

1. **Given** 스펙 본문에 도메인 소유권 위반(예: 참조 도메인이 원천 데이터 수정)이 명시되어 있으면, **When** specify 또는 clarify가 실행되면, **Then** 경고를 출력하고 수정 유도 질문을 제시한다.
2. **Given** 권한 매트릭스에 정의되지 않은 행위가 FR에 등장하면, **When** specify 또는 clarify가 실행되면, **Then** "매트릭스 등록 필요" 경고를 출력한다.

---

### Edge Cases

- plan.md의 bullet 표현이 통일되지 않거나 nested list를 포함할 때, 커버리지 검증은 최상위 bullet을 단위로 판단한다. nested 항목도 개별 매핑이 필요하면 plan 작성자가 최상위로 승격한다.
- drift 감사는 태스크가 선언한 아티팩트 경로 문자열이 실제 파일 트리에 존재하는지만 확인한다. 내용 정합성(로직 구현 완성도)은 판단하지 않는다.
- quickstart 시나리오 증거가 자동 테스트와 수동 체크리스트를 모두 제시한 경우, 자동 테스트가 우선하고 수동 체크리스트는 참고용으로 남긴다.
- enum 값 **제거**는 expand-and-contract와 별도 처리(deprecation 단계 필요). 본 피처에서는 **추가**만 다룬다.
- 피처 디렉토리가 카테고리 하위(`_infra/`, `travel-search/` 등)에 존재하는 경우에도 검증기가 재귀 탐색한다(기존 `-maxdepth 1` 한계 해소).
- 마일스톤 이름 충돌 시 기존 마일스톤에 이슈를 추가하고 새로 만들지 않는다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 tasks 단계 확정 전에 plan.md의 모든 최상위 bullet이 tasks.md의 한 개 이상 태스크에 매핑되어 있는지 검증해야 한다.
- **FR-002**: 시스템은 한 plan bullet이 다단 작업을 내포할 때, tasks.md에 해당 분해 태스크들이 명시적으로 존재하는지 검증해야 한다.
- **FR-003**: 시스템은 PR 단계에서 tasks.md 체크박스 상태와 레포 아티팩트 일치성을 교차 검증하여, 체크됐으나 아티팩트가 없으면 에러, 미체크인데 아티팩트가 있으면 경고를 출력해야 한다.
- **FR-004**: 시스템은 활성 피처에 대해 설정 가능한 주기(기본 1주)로 drift 감사 리포트를 생성해야 한다.
- **FR-005**: 시스템은 quickstart 시나리오별로 자동 테스트 커밋 또는 수동 검증 체크리스트(스크린샷 포함) 중 최소 하나의 실행 증거가 연결되어 있는지 PR 머지 게이트에서 검증해야 한다.
- **FR-006**: 시스템은 plan에 DB 스키마 변경 또는 enum 값 추가가 명시된 경우, tasks.md에 대응 데이터 보정 태스크 존재를 강제해야 한다.
- **FR-007**: 시스템은 마이그레이션 산출물에 대해 "스키마 전용" 또는 "데이터 마이그레이션 포함" 구분 메타데이터를 요구해야 한다.
- **FR-008**: 시스템은 specify → clarify → plan → tasks → implement 순서를 강제하고, 선행 산출물이 없으면 후행 단계를 차단해야 한다.
- **FR-009**: 시스템의 순서 강제 및 산출물 탐색은 피처 디렉토리가 평면 구조(`specs/NNN-*`)와 카테고리 하위 구조(`specs/{domain}/NNN-*`) 양쪽 모두에서 동일하게 동작해야 한다.
- **FR-010**: 시스템은 implement 실행 시 프로젝트 레이어(도메인/애플리케이션/인프라/표현) 배치와 테스트 전략, 커밋 규칙을 안내하는 프로젝트 특화 템플릿을 제공해야 한다.
- **FR-011**: 시스템은 tasks → 이슈 전사 시 Why가 동일한 태스크를 하나의 이슈로 합산하고, 합산 이슈의 추정 공수가 8h를 초과하면 이슈를 분할해야 한다.
- **FR-012**: 시스템은 전사 결과 이슈가 2개 이상이면 피처 단위 마일스톤을 자동 생성하고 이슈를 연결해야 한다. 1개이면 마일스톤을 생성하지 않는다.
- **FR-013**: 시스템은 specify 및 clarify 실행 시 헌법 제V조·제VI조 위반 가능성(도메인 소유권 위반, 권한 매트릭스 미등록 행위)을 스캔하여 경고를 출력해야 한다.
- **FR-014**: 모든 차단/경고 메시지는 위반한 구체적 항목(plan bullet 번호, 태스크 ID, 시나리오 이름 등)을 명시해야 한다.
- **FR-015**: drift 감사 주기 및 감사 리포트 보관 위치는 설정 가능해야 한다.

### Key Entities *(include if feature involves data)*

- **피처 산출물**: spec.md, plan.md, tasks.md, quickstart(별도 파일 또는 tasks 내 섹션), 마이그레이션 산출물 — 각각 디렉토리 구조 내 정해진 위치에서 탐색된다.
- **커버리지 맵**: plan.md bullet ↔ tasks.md 태스크 간의 다대다 매핑 집합. 검증기는 이 맵을 계산해 공집합 여부를 판단한다.
- **drift 리포트**: 시점별 tasks ↔ artifact 불일치 목록(에러/경고 등급 포함). 리포트는 파일로 저장된다.
- **quickstart 증거**: 시나리오 단위 레코드 (자동 테스트 경로 또는 수동 체크리스트·스크린샷 쌍).
- **마이그레이션 메타데이터**: 마이그레이션 산출물별 "스키마 전용"/"데이터 마이그레이션 포함" 구분 라벨.
- **합산 이슈 묶음**: 이슈 전사 결과 이슈·마일스톤·Why 기준 묶음 관계.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: plan.md에 bullet을 추가하고 tasks.md에 대응 태스크를 넣지 않은 상태에서 tasks 확정을 시도하면, 100% 차단된다. 재현 시나리오 3건으로 검증.
- **SC-002**: 최근 종료된 피처(004 등) tasks.md에 drift 감사를 적용하면, #191 회고에서 지적된 미체크/체크 불일치가 모두 리포트에 포함된다.
- **SC-003**: quickstart 시나리오 증거가 누락된 상태로 PR을 열었을 때, 머지 게이트 실패율이 100%이다.
- **SC-004**: plan에 스키마/enum 변경 항목을 넣고 대응 데이터 보정 태스크를 누락한 시나리오에서, tasks 확정 차단이 100% 발생한다.
- **SC-005**: 본 피처 도입 후 발생하는 피처들에서, "plan 항목 미매핑"/"enum 추가 후 데이터 보정 누락" 유형의 사고가 0건으로 유지된다(리포트 기준 분기별 추적).
- **SC-006**: 카테고리 하위 구조(`_infra/`, `travel-search/` 등)에서 speckit 산출물 탐색이 평면 구조와 동일하게 동작한다. 수동 회귀 테스트 케이스 3건 통과.
- **SC-007**: 이슈 전사 결과 이슈당 평균 예상 공수가 8h 이하이고, 2개 이상 이슈 생성 시 마일스톤 자동 연결률이 100%이다.

## Assumptions

- 기존 `.specify/` 하네스가 존재하며 템플릿·훅을 확장·교체할 수 있다.
- GitHub 이슈/마일스톤/라벨은 현재 provider(github)와 동일한 수단으로 조작 가능하다.
- drift 감사가 참조할 "아티팩트 선언"은 tasks.md 내 태스크 항목에 파일 경로 또는 식별 가능한 심볼이 포함되는 것을 전제로 한다. 이 형식은 tasks 템플릿에서 규정한다.
- 헌법 V·VI 스캐너는 스펙 본문 문자열 분석 기반의 휴리스틱을 허용한다(완전 정형 파서 요구 아님).
- 프로젝트 레이어명(도메인/애플리케이션/인프라/표현)은 v2 웹앱(풀스택) 기준을 준거로 한다. MCP/CLI 성격의 컴포넌트는 레이어 매핑 예외를 허용한다.

## Dependencies

- 헌법 v1.2.0 (.specify/memory/constitution.md) — FR-013 기준.
- `specs/README.md` 도메인 정의 — FR-013의 도메인 소유권 판정 기준.
- 기존 `.specify/scripts/bash/enforce-speckit.sh` — FR-008, FR-009의 기반 스크립트 계승 혹은 대체.
- #191 회고(별도 이슈 발행 예정) — 본 피처 검증의 회귀 테스트 소스.
