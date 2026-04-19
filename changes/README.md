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

## 작성 형식

마크다운 1~5줄. 사용자 관점에서 변경의 영향을 한 문장으로 요약하고, 필요 시 배경/이유를 한두 줄 덧붙인다.

```markdown
**towncrier 도입으로 CHANGELOG 충돌 해소**: PR마다 `changes/<이슈>.<타입>.md` 단편 파일을 추가하고, 릴리즈 시 자동 집계되어 `CHANGELOG.md`로 합쳐진다. 단일 파일 충돌 구조적 차단.
```

이슈 링크는 자동으로 붙으므로 본문에 명시할 필요 없음.

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
