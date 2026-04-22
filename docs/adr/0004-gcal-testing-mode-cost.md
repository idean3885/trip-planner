# ADR-0004: Google OAuth Testing 모드 유지 — 심사 비용이 가장 큰 유보 이유

- **Status**: Accepted
- **Date**: 2026-04-22
- **Scope**: 외부 캘린더 OAuth 앱의 심사 승급 여부·시점 의사결정
- **Related**: [ADR-0002 라이브러리 우선 채택 정책 + Minimum Cost 해석](./0002-library-first-policy.md), [spec 018](../../specs/018-gcal-integration/), [spec 019](../../specs/019-gcal-shared-flow/), [spec 021](../../specs/021-gcal-access-guide/)

## Context

본 앱은 외부 캘린더 연동을 위해 외부 OAuth 제공자의 Calendar scope를 요구한다. 이 scope는 해당 제공자가 **Restricted scope**로 분류해 **Production 승급 시 독립 보안 심사**(예: CASA tier 2/3 수준)를 요구한다.

그 결과:

- **Testing 모드**(현재): 개발자가 Test users 목록에 수동 등록한 계정(최대 100명)만 scope 동의 가능. 실사용 가능한 사용자 수 제한이 크고, 신규 사용자마다 개발자 개입 필요.
- **Production 모드**: 일반 사용자 동의 가능. 단 심사 비용이 발생.

심사 비용은 다음이 복합적으로 작용한다.

1. **금전 비용** — 제3자 감사(CASA) 실비 또는 동급 검증 프로세스. 수천 달러대가 일반적으로 보고됨.
2. **시간 비용** — 신청·제출·회신·재제출 사이클이 수 주 이상.
3. **문서·인프라 요건** — 개인정보 처리 문서·로그 인프라·권한 모델 증명 자료 정비.

v2.9.x 시점의 본 프로젝트 성격:

- **1인 개발**, 개인 프로젝트.
- 실사용 규모 < 100명 (가족·동행자 단위).
- 현재 인프라는 모두 무료 티어(Vercel Hobby, Neon 무료, GitHub 등) 위에 있음.

## Decision

**현 시점까지 Testing 모드를 유지한다.** Production 심사 승급은 보류한다.

UX 차원에서는 별도 피처(spec 021)로 "미등록 사용자에게 정직한 제약 안내 + 문의 경로" 를 제공해 혼란을 최소화한다. Testing 모드 자체의 불편은 수용한다.

## Cost

- **금전**: 심사 승급 시 수천 달러대 감사 비용이 선행 지출. 본 프로젝트가 수익을 창출하지 않는 단계에서 Minimum Cost 원칙(ADR-0002) 위반.
- **시간**: 1인 개발자의 주당 가용 시간 중 수 주를 감사 프로세스에 할애 → 피처 개발 지연.
- **문서·인프라 수반 비용**: 개인정보 처리 문서·로깅·인시던트 대응 절차 정비. 현 규모에서 운영 복잡도 초과.

## Reconsider Triggers

다음 중 하나라도 발생하면 본 결정을 재검토한다.

1. **사용자 수 증가** — Test users 한도(100명)가 실제로 운영 제약이 되는 시점. 예: 문의 유입이 빈번해 개발자가 수동 등록을 반복 부담하는 상황.
2. **대체 provider 본격 연동** — [#345 Apple iCloud CalDAV POC](https://github.com/idean3885/trip-planner/issues/345) 같은 별도 채널이 완성되어 Google 의존이 낮아진 경우, 승급 우선순위 재평가.
3. **외부 제공자 정책 변화** — 심사 간소화, Restricted scope 재정의, 무료 심사 경로 신설 등.
4. **수익 모델 수립** — 본 프로젝트가 유료화되거나 후원 모델을 통해 고정 비용을 감내할 수 있게 된 경우.

## Alternatives Rejected

### A. 스코프 축소 — `calendar.events`만 요청

- **기각 이유**: `calendars.insert`(여행 전용 DEDICATED 캘린더 생성)가 불가능해진다(#343). v2.9.0의 per-trip 공유 캘린더 모델이 DEDICATED 생성을 전제로 하므로 핵심 기능 붕괴.
- 결과적으로 Restricted scope를 계속 요청해야 하므로 "축소를 통한 심사 우회"는 유효한 길이 아니다.

### B. 즉시 심사 착수

- **기각 이유**: 금전·시간 비용이 현 프로젝트 규모(사용자 < 100명, 수익 0) 대비 과도. Minimum Cost 원칙과 충돌.
- 심사 완료 전까지 기능 제공이 중단되는 것도 아님(현재도 Test users 한도 내에서 작동).

### C. 내부 인증(self-hosted OAuth 제공자) 구축

- **기각 이유**: 외부 캘린더 플랫폼과의 연동은 해당 플랫폼의 OAuth가 필수. 자체 인증이 대체할 수 없음.

## Consequences

- **UX**: 미등록 사용자는 캘린더 연동 시도 시 즉시 "개발자 등록 필요" 안내를 받는다(spec 021). 일반 실패 토스트를 보는 현재 문제는 해소된다.
- **운영**: 신규 Test user 등록 요청은 리포의 공개 토론 채널(Q&A)로 수렴된다. 개발자가 주기적으로 확인해 Google Cloud Console에 수동 등록.
- **문서**: 랜딩·README에 제약 사전 고지. 본 ADR이 결정 근거를 고정.
- **재고**: 위 Reconsider Triggers 중 하나라도 발생하면 별도 PR로 본 ADR을 보강하거나 새 ADR로 대체한다.
