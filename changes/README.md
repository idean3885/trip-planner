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

## 작성 형식 — What/Why 강제 규칙 (v2.16.6+)

각 단편은 **What** (사용자에게 무엇이 달라졌나) + **Why** (왜 필요했나)만 적는다. HOW는 일체 금지.

### 규칙

* **HOW 금지** — 구현 파일·함수·내부 동작·기술 스택·리팩토링 디테일 일체 미기재
* **도메인 추상화** — 단편을 읽는 대상은 개발자가 아니라 제품 사용자. 도메인 용어(여행·캘린더·동기화·예약·일정)만 사용
* **간결** — 한 항목당 1~3줄. 본문에서 자기완결
* **가독성** — `*` 글머리표, **굵게**, `백틱`(도메인 용어 한정) 사용. 줄바꿈으로 호흡
* **이슈 링크 금지** — towncrier가 자동 부착

### 예시 (좋음)

```markdown
* **Apple 캘린더 가져오기**가 트립 주인이 아닌 동행자도 가능해졌다.
  왜: 자격증명은 사용자 단위인데 등록 진입점이 주인 권한으로만 열려 있었다.
* **외부 캘린더 미연결 안내**가 한쪽만 빠진 경우에도 표시된다.
  왜: 양쪽 모두 미연결일 때만 노출되어 사용자가 빠진 쪽 연결 경로를 찾지 못했다.
```

### 예시 (나쁨 — 금지)

```markdown
* `ImportSection.tsx`의 `notConnected` 분기를 provider별로 분해하고 `AppleConnectCard` 컴포넌트를 신설.
  왜: `connectCalendar` 서비스가 `owner_only` 403을 반환하는 케이스를 UI에서 분기하지 못함.
```

→ 파일명·함수명·HTTP 코드·서비스명이 노출되면 사용자가 노트에서 의미를 추출하지 못한다. 구현 상세는 PR 본문·커밋 메시지·코드에만.

### 적용 시점

v2.16.6 마일스톤부터. 이전 단편은 그대로 보존(소급 수정 안 함).

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
