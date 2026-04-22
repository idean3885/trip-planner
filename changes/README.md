# Changelog Fragments (towncrier)

PR 단위 변경 사항은 이 디렉토리에 단편 파일로 작성한다. 릴리즈 시 `towncrier`가 모아서 `CHANGELOG.md`로 합친다.

## 왜 단편 파일인가

단일 `CHANGELOG.md`는 병렬 PR(워크트리 분기 + AI 보조) 환경에서 동일 라인을 동시에 건드려 충돌이 빈발한다. PR마다 별도 파일로 분리해 충돌을 구조적으로 차단한다. 도입 배경: [#272](https://github.com/idean3885/trip-planner/issues/272).

## 파일 명명 규칙

```
changes/<이슈번호>.<타입>.md
```

- `<이슈번호>`: GitHub Issue 번호 (예: `272`)
- `<타입>`: 아래 6종 중 하나
  - `breaking` — 호환성 깨지는 변경 (MAJOR 후보)
  - `feat` — 신규 기능 (MINOR 후보)
  - `fix` — 버그 수정 (PATCH 후보)
  - `removed` — 기능/API 제거
  - `docs` — 문서 변경
  - `chore` — 의존성, 빌드, 인프라 등 사용자 비가시 변경

여러 단편을 한 PR에서 추가해도 됨 (예: `272.chore.md` + `272.docs.md`).

## 작성 형식 — What / Why 2줄 원칙

v2.9.0부터 각 단편은 **What** (무엇을 바꿨나, 한 줄) + **Why** (왜 바꿨나, 한 줄) 구조로 작성한다. 구현 상세(내부 함수명·파일 경로 나열)는 생략하고 사용자·리더 관점으로 정리.

```markdown
**여행당 1개 공유 캘린더 모델**로 전환. 왜: v2.8.0은 멤버마다 개인 캘린더를 만들어 여행 1개에 N개 중복 생성됐다.
```

왜 단순화했나: 과거 장황한 문단은 릴리즈 노트가 읽기 어려워 사용자가 스킵하게 됨(2026-04-22 피드백). 구현 상세는 PR 본문·커밋 메시지로 충분.

이슈 링크는 towncrier가 자동으로 붙이므로 본문에 명시할 필요 없음.

## CI 게이트

코드 변경이 있는 PR은 `changes/*.md` 단편 1개 이상이 필수다. 예외:

- 라벨 `chore-no-news`가 있는 PR
- 변경이 다음 디렉토리에만 있는 PR: `.github/`, `.specify/`, `docs/lessons/`, `changes/` 자체

자세한 동작은 `.github/workflows/towncrier-fragment-check.yml` 참조.

## 릴리즈 PR 절차

릴리즈 PR(develop → main 또는 마일스톤 정리 PR)에서:

```bash
# 단편 → CHANGELOG.md 적용 + pyproject.toml 버전 범프
uv run towncrier build --version 2.4.1 --yes
# pyproject.toml의 version 필드를 직접 수정 (towncrier는 CHANGELOG만 처리)
# 그 후 커밋
```

`--yes`는 단편 자동 삭제 옵션. 미리보기는 `towncrier build --draft --version 2.4.1`.
