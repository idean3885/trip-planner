# Implementation Plan: 구글 캘린더 권한 제약 감지·안내

**Branch**: `021-gcal-access-guide` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-gcal-access-guide/spec.md`

## Summary

Google OAuth 앱이 Testing 모드(Test users 100명 한정)로 운영되는 제약을 UX 1급 상태로 승격한다. 미등록 사용자의 OAuth access_denied·Calendar API 403을 기존 REVOKED와 구분해 별도 상태(`UNREGISTERED`)로 분류하고, 주인·호스트·게스트 모든 역할에서 spec 020 다이얼로그 패턴을 재사용해 **안내 카드 + GitHub Discussions Q&A 프리필 링크 단일 CTA**를 노출한다. 부수적으로 ADR 0004 "Testing 모드 유지 — 심사 비용 사유"와 README/랜딩의 사전 고지 블록을 추가한다.

## Coverage Targets

- 오류 분류에 `UNREGISTERED` 상태 도입 + `classifyError` 확장 + 기존 `GCalLastError` 타입 확대 [why: error-classifier] [multi-step: 2]
- OAuth 콜백(`/api/gcal/consent`)에서 `error=access_denied` 감지 시 세션/쿠키에 미등록 신호 적재 + `/status` 응답에 `unregistered` 플래그 노출 [why: oauth-access-denied-capture] [multi-step: 2]
- 권한 제약 안내 카드 UI — 주인·호스트·게스트 3 역할 동일 구조(FR-006), 단일 "개발자에게 문의(Discussions)" CTA [why: unregistered-ui-card] [multi-step: 2]
- 사전 고지 블록 — README 또는 랜딩 페이지 한 곳 이상 [why: preemptive-guide]
- ADR 0004 "Google OAuth Testing 모드 유지 — 심사 비용" 신설 [why: adr-testing-mode]
- 자동 회귀 테스트 — 오류 분류 단위 + 패널 렌더 분기 [why: test-coverage] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 App Router, React 19, Auth.js v5, `@googleapis/calendar`, shadcn/ui (vendored Dialog·Button), lucide-react. 본 피처에서 **신규 의존성 없음**.
**Storage**: Neon Postgres — **스키마 변경 없음**. 미등록 상태는 세션/쿠키·응답 플래그 수준에서만 다룬다.
**Testing**: Vitest (`pnpm test`) — 기존 수트에 2 케이스 확장.
**Target Platform**: Vercel Fluid Compute(서버), 모던 브라우저(모바일 우선).
**Project Type**: web application (단일 Next.js 앱, `src/` 루트).
**Performance Goals**: 영향 최소 — 감지 경로는 오류 분류만 확대, 정상 경로 변화 없음.
**Constraints**: 무중단 릴리즈, v1 레거시 API 동작 변경 금지. Test users 수동 등록 체계 유지.
**Scale/Scope**: 실사용 가능한 Google 계정 ≤ 100명(Testing 모드 상한). 본 피처는 그 외 사용자의 UX 복원.

## Constitution Check

*GATE: Phase 0 이전 / Phase 1 이후 재검증 — Constitution v1.2.0.*

| 원칙 | 판정 | 근거 |
|---|---|---|
| I. AX-First | PASS | UI·오류 분류 정비. AI 경로 해당 없음. |
| II. Minimum Cost | PASS | 신규 유료 서비스 없음. 본 피처 자체가 **심사 비용 보류 결정의 UX 보완**이라 원칙과 정합. ADR 0004가 이 결정을 규범화. |
| III. Mobile-First Delivery | PASS | spec 020의 shadcn Dialog 패턴 재사용. quickstart에 모바일 확인 포함. |
| IV. Incremental Release | PASS | v2.9.1 위 PATCH 보강. 스키마·데이터 변경 없어 롤백 용이. |
| V. Cross-Domain Integrity | PASS | 기존 도메인 소유/참조 관계 변경 없음. 오류 분류·세션 플래그·UI만 추가. |
| VI. Role-Based Access Control | PASS | Permission Matrix 변경 없음. 역할별 UI는 동일 카드로 수렴(FR-006). |

신규 gate 위반 없음 → Complexity Tracking 공란.

## Project Structure

### Documentation (this feature)

```text
specs/021-gcal-access-guide/
├── plan.md               # 본 파일
├── research.md           # Phase 0 — 감지 지점·세션 전달·링크 형식·ADR 배치 결정
├── data-model.md         # Phase 1 — 신규 엔티티 없음. 상태 신호만 요약.
├── contracts/
│   ├── gcal-status.md    # /status 응답 unregistered 플래그 확장
│   └── oauth-callback.md # consent 콜백의 access_denied 처리
├── quickstart.md         # Phase 1 — 재현·검증 시나리오 + Evidence
├── checklists/
│   └── requirements.md   # specify 검증 (이미 완료)
└── tasks.md              # /speckit.tasks 산출물
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── gcal/
│   │   │   └── consent/
│   │   │       └── route.ts             # OAuth 동의 콜백에서 error=access_denied 분기 처리
│   │   └── trips/<id>/gcal/status/route.ts  # unregistered 플래그 응답 추가
│   ├── trips/<id>/page.tsx              # 변경 없음 (role prop 전달 기존대로)
│   └── page.tsx                         # 랜딩 사전 고지 블록(택1)
├── components/
│   └── GCalLinkPanel.tsx                # 미등록 상태 안내 카드 분기
├── lib/gcal/
│   └── errors.ts                        # classifyError에 UNREGISTERED 분류 추가
└── types/
    └── gcal.ts                          # GCalLastError 확장 + StatusResponse 플래그

tests/
├── lib/gcal/
│   └── errors.test.ts                   # 신규 — UNREGISTERED 분류 케이스
└── components/
    └── GCalLinkPanel.test.tsx           # 확장 — unregistered 상태 렌더

docs/
├── adr/
│   └── 0004-gcal-testing-mode-cost.md   # 신규 ADR
└── README.md 또는 설정 페이지 중 택 1    # FR-005 사전 고지 블록
```

**Structure Decision**: 기존 Next.js 단일 프로젝트 구조 승계. 편집 범위 = `errors.ts` · `types/gcal.ts` · `status/route.ts` · `consent/route.ts` · `GCalLinkPanel.tsx` · 테스트 2종 · ADR 1 · 가이드 1. 신규 디렉토리 없음.

## Phase Outputs

### Phase 0 — Research (output: `research.md`)

**Q1. OAuth `error=access_denied`를 어떤 레이어에서 포착하는가?**

- **Decision**: 두 지점 모두 포착한다 — (a) `/api/gcal/consent` 콜백에서 query에 `error=access_denied`가 실린 경우, (b) 이미 토큰을 가진 사용자의 `calendars.insert`·`calendarList.insert` 호출에서 403이 반환되는 경우. 두 경로의 귀결을 **같은 상태 신호**로 정규화.
- **Rationale**: Testing 모드에서 제거된 사용자는 (b) 경로로 감지되고, 신규 미등록 사용자는 (a) 경로로 감지된다. 한 지점만 감지하면 케이스 누락.
- **Alternatives**: 클라이언트 측 URL 파라미터 감지 — 신뢰 경계 문제. 기각.

**Q2. 미등록 신호를 UI로 전달하는 수단은?**

- **Decision**: (a)는 단기 쿠키 플래그(httpOnly, TTL 10분)로 기록해 다음 `/status` 조회에서 응답에 `{ unregistered: true }`로 노출. (b)는 서버 에러 응답 본문에 `{ error: "unregistered" }` 추가(403 유지). 클라이언트는 두 신호를 같은 UI로 처리.
- **Rationale**: 쿠키 플래그는 CSR에서 페이지를 다시 그릴 때 자연 소비. 추가 DB 스키마 불필요.
- **Alternatives**: DB의 User 레코드에 unregistered 컬럼 영속화 — 오버엔지니어링(심사 상태는 사용자 단위가 아니라 앱 단위 외부 상태).

**Q3. GitHub Discussions 링크 형식은?**

- **Decision**: `https://github.com/idean3885/trip-planner/discussions/new?category=q-a&title=<프리필>&body=<프리필>`. 프리필 body에 "가입 Google 이메일: ___ (이 자리에 작성해 주세요)" 힌트 포함. 계정 이메일 자동 프리필은 **하지 않는다**(사용자가 공개 범위 직접 선택).
- **Rationale**: URL 프리필은 GitHub 공식 지원. 이메일 자동 프리필은 개인정보 경계 고려.
- **Alternatives**: 이슈 템플릿 신규 생성 — Discussions가 더 맞는 채널이라 불필요.

**Q4. 사전 고지 블록은 랜딩·README 중 어디에?**

- **Decision**: 두 군데 모두. 랜딩(`src/app/page.tsx`) 하단 또는 설치 영역 근처에 짧은 배너 + README의 "설치·사용" 섹션에 1 단락. FR-005가 "최소 하나"지만 비용 낮아 둘 다 커버.
- **Rationale**: 랜딩은 신규 사용자, README는 개발자·GitHub 방문자 — 도달 경로가 다름.
- **Alternatives**: 설정 페이지에만 — 기능 시도 전에는 눈에 안 띔.

**Q5. ADR 0004의 배치·범위는?**

- **Decision**: `docs/adr/0004-gcal-testing-mode-cost.md`. 제목 "Google OAuth Testing 모드 유지 — 심사 비용이 가장 큰 유보 이유". 구조: Context(Restricted scope 필요성) → Decision(Testing 모드 유지) → Cost(금전·시간) → Reconsider triggers(사용자 수·대체 provider·정책 변화) → Rejected alternatives(`calendar.events` 축소 scope, 심사 즉시 착수). 본 피처 PR에 함께 포함.
- **Rationale**: ADR 0002 Minimum Cost의 **금전 원칙**을 캘린더 외부 의존으로 확장·구체화. 3개월 뒤 "왜 아직 심사 안 했지?" 질문에 즉답 가능.

### Phase 1 — Design & Contracts

**`data-model.md`**:
- 신규 DB 엔티티·컬럼 없음.
- 상태 신호만 요약: `UNREGISTERED`를 `GCalLastError` union에 추가. 단기 쿠키 플래그 키 정의(예: `gcal-unregistered`, TTL 10분, httpOnly).

**`contracts/gcal-status.md`**:
- `GET /api/trips/<id>/gcal/status` 응답 확장:
  - 기존 분기 유지
  - 본인이 최근 미등록 감지(쿠키 플래그) → 응답 어느 분기에도 `unregistered: true` 병렬 추가. 플래그 부재 시 키 미출력(역호환).
- `linked:true` / `linked:false` 어느 쪽에도 동반 가능.

**`contracts/oauth-callback.md`**:
- `GET /api/gcal/consent` 콜백 쿼리에 `error=access_denied`가 있으면:
  - 단기 쿠키 플래그 기록(10분, httpOnly)
  - 원래 `returnTo`로 리다이렉트(기본 `/trips/<id>?gcal=unregistered` 힌트 포함)

**`quickstart.md`** — 재현·검증:
- S1: 미등록 주인 — dev에서 Test user 제거 후 "공유 캘린더 연결" → access_denied 후 안내 카드.
- S2: 403 경로 — 토큰 보유 상태에서 서버가 403을 받도록 유도(mock/수동) → 안내 카드 동일.
- S3: 호스트·게스트 동일 경로 — 주인과 같은 카드 확인.
- S4: 사전 고지 블록 — 랜딩·README 확인.
- Evidence: 자동 테스트 2종(분류 단위 + 패널 렌더) + dev 재현 체크리스트(spec 020과 동일한 경량 규약).

### Phase 2 — Tasks (output: `tasks.md` by `/speckit.tasks`)

본 명령에서는 `tasks.md`를 생성하지 않는다. 다음 `/speckit.tasks`가 Coverage Targets를 분해한다.

## Migration Strategy

본 피처는 **스키마·데이터 변경 없음**. expand-and-contract 프레임 내 별도 단계 불필요.

| 단계 | 본 피처 작업 |
|---|---|
| Expand | — |
| Dual read | — |
| Contract | — |
| Non-DB 변경 | 오류 분류 확대, 응답 필드 추가(역호환), UI 분기 추가, 문서 신설 |

## Release Plan

- **유형**: PATCH — UI·오류 분류 보완. 사용자 가시 변화(안내 카드 + 사전 고지)는 있으나 기능 추가가 아닌 **제약의 정직한 전달**.
- **마일스톤**: **v2.9.2** (신설). 본 피처 단독.
- **브랜치**: `021-gcal-access-guide` → develop PR → release/v2.9.2(towncrier build + PATCH 범프) → main PR.
- **Changes 단편**: `changes/<이슈번호>.feat.md` (일반 사용자 가시 변화이므로 feat).
- **롤백**: 단일 파일 revert 조합으로 복구 가능(스키마 변경 없음).

## Complexity Tracking

해당 없음(Constitution 모든 원칙 PASS).
