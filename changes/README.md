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

## 작성 형식 — What + 이유 강제 규칙 (v2.16.9+)

각 단편은 **What 문장 + 이유 문장**으로 작성합니다. HOW는 일체 금지.

### 규칙

* **HOW 금지** — 구현 파일·함수·내부 동작·기술 스택·리팩토링 디테일 일체 미기재
* **도메인 추상화** — 독자는 개발자가 아니라 제품 사용자입니다. 도메인 용어(여행·캘린더·동기화·예약·일정)만 사용
* **합쇼체 통일** — `-합니다` / `-했습니다` / `-됩니다`. 평어체·반말 금지
* **`왜:` 라벨 금지** — 이유는 자연 문장으로. 라벨이 붙으면 한국어 흐름이 끊깁니다
* **감정체 지양** — 과했다·어지럽다·답답하다·시원하다 등 주관 평가 단어 금지. 객관 사실로 서술
* **가독성** — `*` 글머리표, **굵게**, `백틱`(도메인 용어 한정). What 한 줄 + 이유 한 줄 두 문장 권장
* **이슈 링크 금지** — towncrier가 자동 부착

### 예시 (좋음)

```markdown
* **Apple 캘린더 자격증명 등록**을 사용자 단위 화면으로 분리했습니다. 트립 주인이 아닌 사용자도 본인 자격증명을 등록할 수 있습니다.
* **외부 캘린더 미연결 안내**가 한쪽만 빠진 경우에도 노출됩니다. 빠진 쪽 연결 경로를 화면 안에서 찾을 수 있습니다.
```

### 예시 (나쁨 — 금지)

```markdown
* `ImportSection.tsx`의 `notConnected` 분기를 provider별로 분해하고 `AppleConnectCard` 컴포넌트를 신설.
  왜: `connectCalendar` 서비스가 `owner_only` 403을 반환하는 케이스를 UI에서 분기하지 못함.
```

→ 파일명·함수명·HTTP 코드·서비스명이 노출되면 사용자가 의미를 추출하지 못합니다. `왜:` 라벨·평어체도 부자연합니다. 구현 상세는 PR 본문·커밋 메시지·코드에만 둡니다.

### 적용 시점

v2.16.9 release부터 새 규칙 적용. 이전 단편(v2.16.8까지)은 그대로 보존(소급 수정 안 함). v2.16.9에서 함께 합쳐지는 changes/571.fix.md는 새 규칙으로 정정 후 build합니다.

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
