# Feature Specification: 프로젝트 아이덴티티 표면 구축

**Feature Branch**: `011-project-identity-surface`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "전역 풋터(모든 페이지 하단, Made by idean3885 / GitHub / API Docs), About 페이지(/about, 프로젝트 배경·저작자·기술스택·라이선스·GitHub 링크), API 문서 진입점 연결(/docs Scalar 활용). 단일 데이터 소스(프로젝트 메타 상수)에서 읽어 1인 개발 유지보수성 확보. 반응형 분기 최소화. Issue #200 참조."

## Clarifications *(optional, add when drafting raises ambiguity)*

1. **단일 데이터 소스 범위** — 프로젝트 메타(이름·저작자·GitHub URL·라이선스·현재 버전·기술 스택 요약)는 `src/`에서 import 가능한 단일 모듈에 상수로 노출된다. 풋터와 About 페이지는 이 소스만 참조한다. 외부(mcp/, docs/) 메타와의 동기화는 범위 외.
2. **About 페이지 우선순위** — 풋터(P1)와 About(P2)는 같은 PR로 묶지 않는다. 풋터는 선행 배포 가능한 독립 슬라이스. About 페이지는 풋터의 링크 대상이 존재한다는 전제로 뒤에 배포.
3. **API 문서 진입점** — 기존 `/docs`(Scalar) 페이지를 그대로 활용한다. 본 피처는 진입 링크만 추가(풋터·About). `/docs` 자체 개편은 범위 외.
4. **반응형 전략** — 풋터·About 모두 단일 레이아웃(모바일 우선 세로 정렬, 가로 폭이 충분하면 flex-wrap으로 자연 배치)으로 구현한다. 브레이크포인트 분기 금지.

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그를 통해 후속 자동 검증과 연결된다:

- `[artifact: <path>|<path>::<symbol>]` — 산출 파일 식별자(drift 감사 기준)
- `[why: <short-tag>]` — 추적 그룹 키(plan↔tasks 커버리지·이슈 합산)
- `[multi-step: N]` — plan bullet이 다단 작업일 때 최소 매핑 태스크 수(N ≥ 2)
- `[migration-type: schema-only | data-migration]` — 마이그레이션 산출물 구분

형식 검증은 `.specify/scripts/bash/validate-metatag-format.sh`가 수행한다. 의미 검증은 각 US의 validator가 담당한다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 전역 풋터로 프로젝트 출처 즉시 인지 (Priority: P1)

앱을 공유받은 방문자가 어느 페이지에서든 화면 하단에서 "이 앱은 누가 만들었고, 소스코드는 어디에서 볼 수 있고, API는 어떻게 쓰는가"를 확인한다. 별도 페이지로 이동하지 않고도 프로젝트의 기본 정체성을 즉시 인지한다.

**Why this priority**: 현재 앱은 제작자·출처 표시가 없어 공유받은 사람이 "신뢰할 만한 프로젝트인가"를 판단할 근거가 없다. 풋터 한 줄만으로도 이 질문이 해소된다. 가장 적은 UI 비용으로 가장 큰 신뢰 효과를 얻는 슬라이스다. About 페이지가 없어도 풋터만으로 최소한의 아이덴티티 표면이 성립하므로 단독 MVP로 배포 가능.

**Independent Test**: 풋터만 구현·배포하고 About 페이지를 만들지 않은 상태에서도, 모든 페이지 하단에 제작자 이름·GitHub 링크·API Docs 링크가 노출되고 각 링크가 정상 목적지로 이동하면 본 스토리는 완료다. About 링크는 이 시점에 404/미구현이어도 무방(풋터에는 포함하지 않거나 비활성화).

**Acceptance Scenarios**:

1. **Given** 로그인하지 않은 방문자가 랜딩 페이지(`/`)에 접속했을 때, **When** 페이지 하단까지 스크롤하면, **Then** "Made by idean3885", "GitHub ↗", "API Docs ↗" 세 항목이 보이고 각각이 링크로 동작한다.
2. **Given** 방문자가 여행 상세 페이지(`/trips/[id]`) 등 임의의 내부 페이지에 있을 때, **When** 화면 하단을 확인하면, **Then** 동일한 풋터가 같은 항목으로 렌더된다(페이지별 편차 없음).
3. **Given** 방문자가 모바일 뷰(가로 375px)로 접속했을 때, **When** 풋터를 확인하면, **Then** 항목이 세로로 쌓이거나 wrap되어 잘리지 않고 모든 텍스트가 읽힌다(브레이크포인트 분기 없이 자연 정렬).
4. **Given** 방문자가 풋터의 "GitHub ↗"를 클릭했을 때, **When** 새 탭이 열리면, **Then** 프로젝트 저장소(`https://github.com/idean3885/trip-planner`)가 로드된다.
5. **Given** 방문자가 풋터의 "API Docs ↗"를 클릭했을 때, **When** 이동하면, **Then** 기존 `/docs` Scalar 페이지가 렌더된다.

---

### User Story 2 - About 페이지에서 프로젝트 맥락 확인 (Priority: P2)

풋터의 제작자 이름을 본 방문자가 "더 자세히 알고 싶다"고 느꼈을 때 클릭할 수 있는 단일 공식 페이지를 제공한다. 여기서 프로젝트 배경, 저작자, 기술 스택 개요, 라이선스, GitHub 링크를 한 화면에서 확인한다.

**Why this priority**: 풋터로 최소 신뢰는 확보된 뒤의 심화 단계. 풋터 없이 About만 있으면 발견 경로가 없어 의미가 반감된다. 반대로 풋터만 있고 About이 없더라도 기본 목적은 달성되므로 P2. 별도 PR로 분리 가능.

**Independent Test**: `/about` 경로로 직접 접속했을 때 프로젝트 배경·저작자·기술 스택 요약·라이선스·GitHub 링크가 한 화면에 보이고, 모바일 뷰에서도 정상 렌더되면 완료. 풋터의 "About" 진입 여부는 US1/US2 간 인접 관심사이지만, 본 스토리의 완료 조건은 `/about` 페이지 자체의 표시·접근성이다.

**Acceptance Scenarios**:

1. **Given** 방문자가 `/about` URL로 직접 접속했을 때, **When** 페이지가 로드되면, **Then** 프로젝트 이름, 배경 설명(1-2문단), 저작자 이름, 라이선스, 기술 스택 요약, GitHub 링크가 모두 노출된다.
2. **Given** `/about` 페이지가 렌더됐을 때, **When** 표시된 프로젝트 이름·저작자·GitHub URL·라이선스를 확인하면, **Then** 풋터의 동일 필드와 100% 일치한다(단일 소스 기반).
3. **Given** 방문자가 모바일 뷰로 `/about`에 접속했을 때, **When** 페이지를 스크롤하면, **Then** 모든 섹션이 가로 스크롤 없이 읽히고 레이아웃이 깨지지 않는다.
4. **Given** 방문자가 About 페이지의 GitHub 링크를 클릭했을 때, **When** 새 탭이 열리면, **Then** 풋터의 GitHub 링크와 같은 URL로 이동한다.

---

### User Story 3 - API 문서 접근성 강화 (Priority: P3)

API를 사용하려는 이용자(1인 개발자 본인 포함)가 설정 페이지 상단에서도 API 문서로 즉시 이동할 수 있도록, 풋터의 링크 외에 설정 페이지 내부에서도 "API 문서 →" 진입점을 제공한다.

**Why this priority**: 풋터 링크만으로도 도달 가능하므로 중복성 있는 강화 작업. 하지만 PAT/토큰 관리와 API 문서는 맥락상 인접하므로, 설정 페이지 이용자에게는 추가 진입점이 체감 편의성을 높인다. 본 피처의 핵심 가치와 독립적이므로 P3.

**Independent Test**: 설정 페이지(`/settings` 등 기존 경로) 상단에 "API 문서 →" 링크가 노출되고 `/docs`로 이동하면 완료. 풋터·About과 무관하게 단독 검증 가능.

**Acceptance Scenarios**:

1. **Given** 로그인한 사용자가 설정 페이지에 접속했을 때, **When** 상단 영역을 확인하면, **Then** "API 문서 →" 링크가 보인다.
2. **Given** 사용자가 설정 페이지의 "API 문서 →" 링크를 클릭했을 때, **When** 이동하면, **Then** 풋터의 "API Docs" 링크와 동일한 `/docs` 페이지가 렌더된다.

---

### Edge Cases

- **About 페이지 미배포 시 풋터 "About" 링크 상태**: US1 단독 MVP 상황에서 풋터에 About 링크를 넣지 않는다(비노출). About 배포 PR에서 풋터 링크를 함께 추가한다. 이유: 깨진 링크 노출 금지.
- **프로젝트 메타 소스 누락 필드**: 단일 상수에서 읽는 필드(이름·GitHub URL·라이선스 등) 중 하나라도 빈 문자열이면 해당 UI 요소를 렌더하지 않고 빌드 에러로 조기 감지한다(런타임 fallback 금지).
- **외부 링크 보안**: GitHub·API Docs 등 외부 링크는 `target="_blank"` + `rel="noopener noreferrer"`를 강제한다.
- **다크 모드/테마 대응**: 현재 앱이 단일 테마라면 풋터도 단일 테마. 추후 테마 추가 시 풋터가 자동 대응하도록 디자인 토큰(시스템 색상)만 사용, 하드코딩 색상 금지.
- **풋터 위치 vs 짧은 콘텐츠 페이지**: 콘텐츠가 화면보다 짧은 페이지(예: 빈 여행 목록)에서도 풋터가 하단에 고정되어 보이도록 레이아웃이 뷰포트 최소 높이를 채운다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 모든 라우트(랜딩·여행 목록·여행 상세·설정 등)의 하단에 동일한 풋터를 렌더해야 한다.
- **FR-002**: 풋터는 최소 세 항목 — "Made by {저작자}", GitHub 링크, API Docs 링크 — 을 포함해야 한다.
- **FR-003**: 풋터와 About 페이지의 메타 정보(저작자·GitHub URL·라이선스·프로젝트 이름)는 동일한 단일 모듈에서 읽어야 한다.
- **FR-004**: 프로젝트 메타 소스는 최소한 다음 필드를 노출해야 한다 — 프로젝트 이름, 저작자 표시명, GitHub 저장소 URL, 라이선스 식별자, 기술 스택 요약.
- **FR-005**: 외부 링크(GitHub·API Docs)는 새 탭으로 열리며 `rel="noopener noreferrer"`가 적용되어야 한다.
- **FR-006**: 시스템은 `/about` 경로에서 About 페이지를 공개 접근 가능하게 제공해야 한다(로그인 불요).
- **FR-007**: About 페이지는 프로젝트 배경 설명, 저작자, 기술 스택 요약, 라이선스, GitHub 링크를 한 화면에 포함해야 한다.
- **FR-008**: 설정 페이지 상단에 API 문서로 이동하는 링크를 제공해야 한다.
- **FR-009**: 풋터·About의 레이아웃은 단일 스타일 선언으로 모바일·데스크톱 모두 가독 상태를 유지해야 한다(별도 브레이크포인트 분기 없이 flex-wrap 또는 자연 세로 정렬).
- **FR-010**: 메타 소스의 필수 필드가 비어있거나 정의되지 않은 경우 빌드 단계에서 감지되어야 하며 런타임 fallback을 사용해선 안 된다.
- **FR-011**: 풋터는 콘텐츠 높이가 뷰포트보다 짧은 페이지에서도 하단에 고정되어 보여야 한다(sticky footer 패턴).

### Key Entities *(include if feature involves data)*

- **ProjectMeta**: 프로젝트의 공개 메타데이터. 단일 모듈 내 상수로 정의되며 빌드 시점에 고정. 필드 — 이름, 저작자 표시명, GitHub URL, 라이선스, 기술 스택 요약(문자열 또는 배열), 설명(About 본문용). 외부 API 호출 없음, DB 저장 없음.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 앱의 모든 공개 페이지에서 풋터가 노출된다(수동 감사 기준 100% 페이지 적중).
- **SC-002**: 풋터의 GitHub·API Docs 링크는 한 번의 클릭으로 목적지에 도달하며, 404·깨진 링크·잘못된 도메인이 없다(각 링크 목적지 200 응답 확인).
- **SC-003**: 풋터의 저작자·GitHub URL·라이선스 값과 About 페이지의 동일 필드 값이 문자열 레벨에서 100% 일치한다(단일 소스 기반 검증).
- **SC-004**: 모바일 뷰(가로 375px)와 데스크톱 뷰(가로 1280px) 모두에서 풋터·About이 가로 스크롤 없이 전체 내용이 보인다.
- **SC-005**: `/about` 페이지는 로그인하지 않은 방문자가 직접 URL로 접속해도 정상 렌더된다(인증 리다이렉트 없음).
- **SC-006**: 메타 소스의 필수 필드가 누락된 상태로 빌드 시도하면 타입 또는 정적 검사에서 실패한다(런타임 빈값 노출 0건).

## Assumptions *(informative)*

- 앱은 Next.js App Router 구조이며 전역 풋터는 최상위 레이아웃(`src/app/layout.tsx` 또는 그룹 레이아웃)에서 선언 가능하다.
- 라이선스는 이미 `pyproject.toml`·`package.json` 등에서 정의되어 있으며 본 피처는 그 값을 참조하지 않고 별도 메타 상수로 명시한다(소스 정본 차이로 인한 drift 방지는 별건).
- API 문서 경로 `/docs`는 이미 Scalar로 렌더되며 본 피처는 링크만 추가한다(Scalar 자체 개편 제외).
- 저작자 이름·GitHub URL은 CLAUDE.md와 devex provider 정의에서 `idean3885` / `https://github.com/idean3885/trip-planner`로 확정된 값을 그대로 사용한다.
- 본 피처의 모든 UI는 단일 색상 테마를 가정한다. 다크 모드 분기는 범위 외.
