# Research — Spec 029 (여행을 일정 카테고리로 재정의 + 캘린더 형태 뷰)

Phase 0 산출. plan.md의 Unknowns를 해소한 결과입니다.

## Topic 1 — 캘린더 라이브러리 선택

**Decision**: shadcn/ui `Calendar` 컴포넌트(vendored) 사용. 내부적으로 `react-day-picker`를 wrapping한 형태이며 shadcn/Tailwind v4 토큰 시스템과 정합합니다.

**Rationale**:
- trip-planner는 shadcn/ui vendored 패턴(spec 012/013에서 도입) — 새 라이브러리 추가 없이 Calendar 컴포넌트를 `npx shadcn add calendar`로 vendor 가능
- shadcn Calendar의 underlying은 react-day-picker(MIT). 키보드 접근성(arrow key 이동·Enter 선택·Esc 닫기)·로케일(`ko`)·`modifiers` 슬롯(트립 기간 강조·오늘 강조·다중 일정 dot)을 표준 제공
- 자체 구현은 i18n·a11y·focus management를 새로 만들어야 해 비용 큼

**Alternatives considered**:
- react-day-picker 직접 사용 → shadcn 토큰 적용 작업이 중복. shadcn vendored wrapping이 정합
- 자체 구현 → a11y·로케일·focus management 비용. 1인 개발 환경에서 부담
- FullCalendar / TUI Calendar → 풀스펙 캘린더로 미니 캘린더 용도엔 과한 의존성

**Implications**:
- `src/components/ui/calendar.tsx` vendored 추가 (shadcn 표준 위치)
- `modifiers` prop으로 트립 기간 강조 + 다중 트립 dot 표시
- ko-KR 로케일 + 일요일·공휴일 색은 디자인 토큰 매핑

## Topic 2 — derived 기간 계산 시점·캐싱

**Decision**: 매 응답 시 `prisma.day.aggregate({ where: { tripId }, _min: { date }, _max: { date } })` 쿼리로 derived 계산. 캐시 컬럼은 두지 않습니다. expand-and-contract 패턴 적용.

**Rationale**:
- 일정 ≤ 수백 건 / 여행 규모에서 `(tripId, date)` 인덱스가 이미 있어(Day 모델 기본) aggregate 쿼리 latency가 무시 가능
- Prisma 7에 native computed/derived field 정식 지원 없음 — application 계층에서 명시 계산
- 캐시 컬럼은 일정 변경 시마다 webhook으로 갱신해야 해 동기화 비용·실패 risk 큼

**Alternatives considered**:
- `Trip` 모델에 `startDate`/`endDate`를 cache로 유지 + Day write 시 webhook 갱신 → 동기화 실패 시 stale risk
- 매 응답마다 `Trip.days` include 후 application 계산 → aggregate보다 비용 큼

**Implications**:
- `src/lib/trip-period.ts`에 `getDerivedPeriod(tripId): Promise<{ startDate: Date | null; endDate: Date | null }>` 헬퍼 정의
- expand 단계: 명목 컬럼 그대로 + 헬퍼 도입(둘 다 노출). 응답은 명목 우선
- migrate 단계: 모든 호출처를 헬퍼 사용으로 전환. 응답은 derived 우선, 명목은 fallback
- contract 단계: 명목 컬럼 DROP

## Topic 3 — mobile in-place swap + 좌 스와이프 뒤로

**Decision**: `react-swipeable` (MIT) 사용. native Pointer Events 대신 검증된 lib로 a11y·touch·pointer 정책 통합. 라우팅 변경 없음.

**Rationale**:
- 1인 개발 환경에서 검증된 swipe lib가 native Pointer Events 직접 구현보다 회귀 risk 적음
- `react-swipeable`은 ~3KB minified, MIT, deps 0
- a11y 보조 — "뒤로" 버튼을 함께 두어 키보드 사용자도 같은 인터랙션 가능

**Alternatives considered**:
- Native Pointer Events + CSS transform 직접 구현 → 코드 적지만 edge case(스크롤 vs 스와이프 구분·iOS 1-finger swipe 등) 처리 비용
- `framer-motion` swipe gesture → 더 무거움 (37KB)

**Implications**:
- `src/components/trip/MobileSwipeShell.tsx`에 swipe shell 구현
- 좌 스와이프 = 기본 리스트(트립 전체 DAY 목록)로 복귀. URL 미변경. `useState`로 view state 관리
- "뒤로" 버튼을 mobile 일정 리스트 헤더에 함께 노출(키보드 a11y)

## Topic 4 — 사용자 prefs 저장 위치

**Decision**: localStorage 사용. DB 저장은 본 spec 범위 밖.

**Rationale**:
- 1인 + 동행자 소수 환경에서 device 동기화 가치 작음 — 한 device에서 자기 prefs 회복이면 충분
- DB 저장은 schema 비용(`UserPref` 모델 신설 + RBAC)·migration·sync 흐름 모두 추가 작업
- localStorage 키 prefix: `trip-planner:prefs:v1:` (스키마 변경 시 prefix 증분)

**Alternatives considered**:
- `User` JSON 컬럼 `preferences` 추가 → schema 비용 + migration 필요
- 별도 `UserPref` 모델 → 더 무거움
- 쿠키 → SSR과의 통합 복잡

**Implications**:
- `src/lib/user-prefs.ts`에 typed wrapper (read·write·zod schema 검증)
- 체크박스 상태 외 향후 prefs도 같은 wrapper 사용
- 미지원 브라우저(localStorage 비활성)에선 default(현재 여행만 체크) 동작

## Topic 5 — 트립 라벨 색 자동 부여

**Decision**: shadcn token에서 6색 palette pool 정의(`--trip-color-1`~`--trip-color-6`) + Trip ID 기반 hash로 결정적 할당.

**Rationale**:
- 사용자가 색 선택 못 함 → 자동 부여 + 한 여행은 항상 같은 색(hash 결정성)
- 6색이면 통합 뷰에서 동시 표시 ≤ 10건 가정에서 시각 구분 충분 (사용자 동시 표시 평균 2~3건)
- shadcn token에 등록하면 light/dark 모드 자동 분기

**Alternatives considered**:
- 트립 생성 순서 기반 (1, 2, 3, ...) → 트립 삭제·재정렬 시 색이 흔들림
- 사용자 색 선택 UI → 본 spec 범위 밖. 후속 spec에서 추가 가능
- Google Calendar의 12색 → palette 크기 과함. 한국 디자인 시안에 무거움

**Implications**:
- `src/lib/trip-palette.ts`에 `getTripColor(tripId: number): string` 정의 (간단한 modulo hash)
- WCAG AA 대비 검증 — palette 6색 모두 text-foreground와 대비 4.5:1 이상 확보
- 디자인 토큰 SSOT: `src/app/globals.css`의 `@theme` 블록에 색 키 추가

## Topic 6 — expand-and-contract 마이그레이션 분해

**Decision**: 3단계 release로 분해.

| 단계 | Version | 내용 |
|------|---------|------|
| expand | **v2.17.0** (MINOR) | `Trip.startDate`/`endDate` 컬럼 유지 + `src/lib/trip-period.ts` 헬퍼 도입(둘 다 노출). 응답은 명목 우선(현행), derived는 추가 필드(또는 같은 필드 보강). |
| migrate | **v2.18.0** (MINOR) | 모든 호출처(웹 UI·OpenAPI·MCP·외부 캘린더 import·공유 캘린더 push)를 derived 사용으로 전환. 명목 컬럼은 첫 일정 추가 전 fallback에만 사용. UI에 캘린더 뷰 도입 (US2). |
| contract | **v3.0.0** (MAJOR) | `Trip.startDate`/`endDate` 컬럼 DROP. MCP `create_trip`/`update_trip` 시그니처 breaking(startDate/endDate 제거). spec 030(자동 부트스트랩)과 동시 출시. |

**Rationale**:
- 메모 [project_expand_contract_pattern] 정합 — v2.7.0 적용 흐름 참조
- expand → migrate 사이에 1주 이상 관찰 권장 (회귀 발견 시 rollback 자유도)
- v3.0.0 contract는 spec 030(자동 부트스트랩)과 동시 출시 — 사용자가 업데이트 안내를 자연어로 받게 함

**Alternatives considered**:
- 한 release에 contract까지 → 회귀 risk 큼. 메모 [feedback_root_cause_over_patch]와 충돌하지 않지만 안전 마진 부족
- v3.0.0에 expand·migrate·contract 다 묶기 → 같은 risk

**Implications**:
- 마일스톤 3개 생성 (v2.17.0·v2.18.0·v3.0.0)
- US3(통합 캘린더)는 v2.18.0(migrate)에서 도입. US1·US2의 기본 캘린더 뷰는 v2.17.0(expand)부터 점진 노출 가능
- spec 030은 v3.0.0에 동시 release. spec 030 자체 expand-and-contract는 별도 분해 — spec 030 plan에서 결정
