# Quickstart: [FEATURE]

**Feature**: `[###-feature-name]` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 수동/자동 회귀 케이스를 정의한다. 각 시나리오는 하나의 `## <Section>` 하위 `### Evidence` 서브섹션으로 실행 증거를 기록한다. PR 머지 게이트(`.github/workflows/speckit-gate.yml`)가 본 문서를 `validate-quickstart-ev.sh`로 자동 검증한다.

## 규약

- 한 `## <Section>` 안에는 하나 이상의 `### Scenario X-N` 블록과 공용 `### Evidence` 서브섹션을 둔다.
- Evidence 서브섹션은 다음 두 형태 중 최소 하나를 포함해야 한다:
  1. **자동 테스트 경로** — 예: `validate-metatag-format.sh --self-test`, 테스트 파일 `tests/foo.spec.ts` 등. 문자열 `자동 테스트`·`self-test`·확장자 `.sh/.py/.ts` 중 하나가 들어가면 유효로 인정.
  2. **수동 체크리스트** — `- [x]` 항목 ≥1. 미체크(`- [ ]`)만 있으면 유효하지 않다.
- 스크린샷이 필요한 경우 `docs/evidence/<feature>/<scenario>-*.png` 경로를 기록한다. CLI 출력 로그로 충분하면 "해당없음" 명시 후 `--self-test` 등 재현 수단으로 대체한다.

## 섹션 예시

```markdown
## Foundational — 핵심 파서

### Scenario F1: 허용 형식 통과

(입력 예시, 기대 결과)

### Scenario F2: 거부 형식 차단

(입력 예시, 기대 위반)

### Evidence

- 자동 테스트: `.specify/scripts/bash/some-validator.sh --self-test`
- 수동 체크리스트:
  - [x] F1 재현 완료
  - [x] F2 재현 완료
- 스크린샷: 해당없음 (CLI 로그로 대체)
```

## 본문 작성

<!--
  각 User Story(US1, US2, …)마다 아래 패턴으로 섹션을 추가한다.
  Evidence 서브섹션이 누락되거나 증거 표기가 없으면 speckit-gate가 경고(phase=expand) /
  차단(phase=contract)한다.
-->

## [Section Name]

### Scenario X-1: [짧은 제목]

[시나리오 본문]

### Evidence

- [자동 테스트 경로 또는 수동 체크리스트]
