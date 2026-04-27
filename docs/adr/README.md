# Architecture Decision Records

회귀 방지·규범적 결정을 짧게 기록한다. **나중에 뒤집으면 비용이 큰 결정**만 여기에 남긴다. 일상적 의사결정은 스펙(`specs/*`)이나 플랜에서 관리한다.

> **용어 주석**: 관례상 "ADR"이라고 부르지만, 본 디렉토리는 **아키텍처에 국한하지 않는다**. 도구·프로세스·문서 작성 스타일 등 "3개월 뒤에도 뒤집으면 비용이 큰" 규범적 결정 전반을 포함한다. Nygard 원전의 "architecturally significant decisions" 해석을 넓게 적용한다.

## 파일 규칙

- 파일명: `NNNN-kebab-case.md` (4자리 번호, 증가)
- 상태: `Proposed` · `Accepted` · `Superseded` · `Deprecated`
- 본문 구조: **Context · Decision · Consequences · Alternatives Considered**
- 한 ADR은 하나의 결정만 다룬다. 연결된 결정은 별도 ADR로 분리하고 서로 링크.

## 목차

| 번호 | 제목 | 상태 | 날짜 |
|------|------|------|------|
| [0001](./0001-spec-terminology-policy.md) | 스펙·문서 작성 용어 정책 | Accepted | 2026-04-20 |
| [0002](./0002-library-first-policy.md) | 라이브러리 우선 채택 정책 + Minimum Cost 해석 | Accepted | 2026-04-20 |
| [0003](./0003-per-trip-shared-calendar.md) | 여행 캘린더는 여행당 1개 공유 캘린더로 통일 | Accepted | 2026-04-22 |
| [0004](./0004-gcal-testing-mode-cost.md) | Google OAuth Testing 모드 유지 — 심사 비용이 가장 큰 유보 이유 | Accepted | 2026-04-22 |
| [0005](./0005-expand-and-contract-pattern.md) | 무중단 DB 마이그레이션은 Expand-and-Contract 패턴으로 진행 | Accepted | 2026-04-27 |
