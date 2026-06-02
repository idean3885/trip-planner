# Quickstart: lint/format/디자인 토큰 가드 인프라 선행

**Feature**: `038-lint-format-token-guard` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 수동/자동 회귀 케이스와 실행 증거를 정의한다. lint/format 인프라는 런타임 화면이 없으므로 증거는 명령 실행 로그와 기존 테스트 통과로 대체한다.

## US1 — 강화된 일관성 규칙·포맷

### Scenario US1-1: 일관성 위반 보고

미사용 import·잘못된 훅 사용·접근성 결함이 있는 코드에서 `npm run lint`가 각 위반을 규칙명과 함께 보고한다.

### Scenario US1-2: 포맷 정렬

`npm run format`(prettier --write) 실행 시 들여쓰기·따옴표·import 순서·Tailwind 클래스 순서가 규약대로 통일된다.

### Evidence

- 자동 테스트: `npx eslint <위반 샘플>` 출력 로그로 규칙명 확인. `npm run format:check`(prettier --check) 통과.
- 수동 체크리스트:
  - [x] 미사용 import 샘플이 lint 에러로 보고됨
  - [x] format 실행 후 import·Tailwind 클래스 정렬 확인
- 스크린샷: 해당없음 (CLI 로그로 대체)

## US2 — 디자인 토큰 색상 가드

### Scenario US2-1: hex/rgb 리터럴 차단

컴포넌트에 `#3b82f6`·`rgb(...)` 또는 Tailwind 임의값 `bg-[#fff]`를 직접 적으면 `npm run lint`가 해당 위치를 차단한다.

### Scenario US2-2: 예외 통과

토큰 정의처(`globals.css @theme`, `design/tokens.json`)와 외부 자산은 예외로 분류되어 차단되지 않는다.

### Evidence

- 자동 테스트: `npx eslint <hex 포함 샘플>`이 `no-restricted-syntax` 위반을 보고. 예외 파일은 통과.
- 수동 체크리스트:
  - [x] hex 리터럴 샘플 차단 확인
  - [x] Tailwind 임의값 `-[#...]` 차단 확인
  - [x] 토큰 정의처 예외 통과 확인
- 스크린샷: 해당없음 (CLI 로그로 대체)

## US3 — 정비 비대화 방지 + 동작 동등성

### Scenario US3-1: 자동정비 일괄 적용

`eslint --fix` + `prettier --write` 실행으로 자동 해소 가능한 위반이 일괄 수정된다.

### Scenario US3-2: 잔여 분류 + 동작 불변

자동정비 후 잔여는 warn/예외로 분류되어 `npm run lint`가 실패하지 않고, `npm run test`(vitest 57)가 전부 통과한다.

### Evidence

- 자동 테스트: `npm run test` (vitest run) 전체 통과 로그 — 런타임 동작 동등성. `npm run lint` exit 0.
- 수동 체크리스트:
  - [x] eslint --fix·prettier --write 후 위반 수 감소 확인
  - [x] 잔여 위반 목록 기록 확인
  - [x] vitest 57 테스트 전부 통과
- 스크린샷: 해당없음 (CLI 로그로 대체)
