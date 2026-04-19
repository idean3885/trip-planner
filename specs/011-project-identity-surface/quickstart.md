# Quickstart: 프로젝트 아이덴티티 표면 구축

**Feature**: `011-project-identity-surface` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 수동/자동 회귀 케이스를 정의한다. PR 머지 게이트가 `validate-quickstart-ev.sh`로 자동 검증한다.

## US1: 전역 풋터

### Scenario US1-1: 모든 공개 페이지 하단 렌더

- `/`, `/about`(배포 후), `/docs`, `/settings`(로그인 상태), `/trips/<id>`(로그인+소유 여행)에 접속해 하단 스크롤 시 동일 풋터 렌더.
- 각 풋터에서 `Made by idean3885`, `GitHub ↗`, `API Docs ↗` 노출 확인.

### Scenario US1-2: 외부 링크 동작

- `GitHub ↗` 클릭 → 새 탭으로 `https://github.com/idean3885/trip-planner` 열림.
- `API Docs ↗` 클릭 → 같은 탭 `/docs` 이동, Scalar UI 렌더.

### Scenario US1-3: 모바일 375px 레이아웃

- Chrome DevTools Device Mode로 iPhone SE(375px) 설정.
- 풋터 항목이 wrap되어 잘리지 않고 모두 읽힘.

### Scenario US1-4: 짧은 콘텐츠 페이지 sticky 동작

- 여행 0건 상태(`/` 또는 `/trips`) 등 콘텐츠 높이가 뷰포트보다 짧은 페이지에서 풋터가 뷰포트 하단에 붙어 보임(페이지 중간에 뜨지 않음).

### Evidence

- 자동 테스트: `pnpm tsc --noEmit` — `src/lib/project-meta.ts`의 필수 필드 누락 시 타입 에러로 차단(spec SC-006).
- 수동 체크리스트:
  - [ ] US1-1: 5개 경로 풋터 노출 확인
  - [ ] US1-2: GitHub/API Docs 링크 목적지 200 응답
  - [ ] US1-3: 375px 뷰 스크린샷 `docs/evidence/011-project-identity-surface/us1-3-mobile.png`
  - [ ] US1-4: 짧은 콘텐츠 페이지 sticky 스크린샷 `docs/evidence/011-project-identity-surface/us1-4-sticky.png`
- 스크린샷: `docs/evidence/011-project-identity-surface/us1-*.png`

## US2: About 페이지

### Scenario US2-1: `/about` 공개 접근

- 로그아웃 상태에서 `/about` 직접 접속 → 200 응답, 인증 리다이렉트 없음(spec SC-005).

### Scenario US2-2: 모든 필드 노출

- 프로젝트 이름, 배경 1-2문단, 저작자, 라이선스, GitHub 링크, 기술 스택 목록 모두 화면에 보임.
- 저작자·GitHub URL·라이선스 값이 풋터와 문자열 레벨 동일(spec SC-003).

### Scenario US2-3: 모바일 가독성

- 375px 뷰에서 About 페이지 가로 스크롤 없음, 모든 섹션 읽힘.

### Scenario US2-4: 단일 소스 일관성

- `projectMeta.author`를 임의 변경 → About·풋터 양쪽이 동일하게 바뀜(같은 상수 참조).

### Evidence

- 자동 테스트: `pnpm tsc --noEmit` (타입 일관성), `pnpm lint`(외부 링크 `rel` 규약은 eslint-plugin-react 기본 규칙으로 감지되면 활용, 아니면 수동).
- 수동 체크리스트:
  - [ ] US2-1: 로그아웃 상태 `/about` 200 응답 curl 또는 브라우저 확인
  - [ ] US2-2: 모든 필드 노출 스크린샷
  - [ ] US2-3: 375px 스크린샷 `docs/evidence/011-project-identity-surface/us2-3-mobile.png`
  - [ ] US2-4: `projectMeta.author` 임시 변경 후 풋터·About 동일 갱신 확인(커밋 금지, 로컬 확인만)
- 스크린샷: `docs/evidence/011-project-identity-surface/us2-*.png`

## US3: 설정 페이지 API 문서 진입점

### Scenario US3-1: 링크 노출

- 로그인 상태 `/settings` 접속 → 페이지 상단에 `API 문서 →` 링크 노출.

### Scenario US3-2: 이동 경로

- 링크 클릭 → 같은 탭으로 `/docs` 이동, Scalar UI 렌더.

### Evidence

- 수동 체크리스트:
  - [ ] US3-1: 설정 페이지 상단 링크 스크린샷 `docs/evidence/011-project-identity-surface/us3-1-settings.png`
  - [ ] US3-2: 링크 클릭 → `/docs` 도달
- 자동 테스트: 해당없음 (UI 링크 배치는 타입 시스템 밖). 수동 체크리스트로 대체.
- 스크린샷: `docs/evidence/011-project-identity-surface/us3-*.png`

## Rollout 순서

1. **PR #1 (US1 + 메타 소스)**: `src/lib/project-meta.ts` + `src/components/Footer.tsx` + `src/app/layout.tsx` 편집. dev 환경 검증 후 develop 머지.
2. **PR #2 (US2)**: `src/app/about/page.tsx` + 풋터에 About 링크 추가. PR #1 머지 후 진행.
3. **PR #3 (US3)**: `src/app/settings/page.tsx` API 문서 링크 1줄 추가. PR #1과 독립적으로 진행 가능.

PR #1 단독 배포 시 About 링크는 풋터에 포함하지 않는다(깨진 링크 방지, spec Edge Cases).
