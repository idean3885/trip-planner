# Quickstart — Spec 029 (여행 모델 + 캘린더 뷰)

implementation 후 본 spec의 핵심 시나리오를 검증하는 절차입니다.

## 사전 준비

```bash
# 워크트리 분기 + 의존성
git checkout 029-trip-as-category
pnpm install --frozen-lockfile

# DB 준비 (preview/dev neondb_dev)
pnpm prisma migrate deploy

# 개발 서버
pnpm dev
```

## 시나리오 1 — 동적 derived 기간 갱신 (US1)

1. 브라우저에서 `https://dev.trip.idean.me/trips/new` 진입
2. 새 여행 생성 — title "테스트", 명목 기간 2026-07-01 ~ 2026-07-03 입력
3. 여행 상세 헤더에 "2026.7.1. ~ 2026.7.3." 표시 확인 (명목 fallback)
4. `+ 일정 추가`로 2026-07-04 일정을 추가
5. 새로고침 없이 헤더가 "2026.7.1. ~ 2026.7.4."로 자동 갱신됨을 확인

**기대 결과**: 트립 헤더 날짜가 derived 값(min/max(Day.date))으로 표시됩니다. 명목 컬럼은 더 이상 신뢰값이 아닙니다.

## 시나리오 2 — 캘린더 뷰 desktop split (US2)

1. desktop(viewport ≥1024px) 브라우저에서 `https://dev.trip.idean.me/trips/<id>` 진입
2. 화면이 좌·우 split — 한쪽 캘린더, 다른 쪽 일정 리스트 동시 노출 확인
3. 캘린더에서 임의 날짜 클릭 → 사이드 리스트가 그 날 일정으로 즉시 갱신
4. 사이드 영역이 사라지지 않음 확인

## 시나리오 3 — 캘린더 뷰 mobile stacked + swipe (US2)

1. mobile(viewport <1024px) 또는 DevTools mobile emulation으로 진입
2. 캘린더 상단 + 일정 리스트 하단 stacked 확인
3. 캘린더에서 임의 날짜 클릭 → 하단 리스트가 그 날 일정으로 swipe 전환 (URL 미변경)
4. 좌 스와이프 → 기본 리스트(트립 전체 DAY 목록)로 복귀
5. "뒤로" 버튼 클릭으로도 같은 복귀 동작 확인 (a11y)

## 시나리오 4 — 통합 캘린더 + 체크박스 (US3)

1. 사용자가 둘 이상의 여행에 속해 있는지 확인 (없으면 두 여행 생성)
2. 한 여행 상세 진입 — 사이드 체크박스에 모든 여행 목록 표시 + 현재 여행만 체크 확인
3. 다른 여행 체크박스 켜기 → 캘린더에 두 여행 일정이 동시 표시 (라벨 색 구분) 확인
4. 같은 날짜에 두 여행 일정이 겹치면 두 카드 동시 노출 확인

## 시나리오 5 — MCP `create_trip` breaking (v3.0.0 contract)

1. 협력자 환경에서 trip-planner-mcp v3.0.0 설치 (spec 030 자동 부트스트랩)
2. Claude Code에서 `mcp__trip__create_trip(title="테스트", startDate="2026-07-01", endDate="2026-07-03")` 호출 시도
3. MCP 서버 응답: `error: Unknown parameter 'startDate'` 또는 동등 메시지
4. AI client: 사용자에게 변경 사항 안내 + 대안(`create_day` 후 호출) 제안

### Evidence

#### 자동 검증

```bash
# 단위 — derived 헬퍼·라벨 색·prefs wrapper
pnpm vitest run tests/lib/trip-period.test.ts tests/unit/trip-palette.test.ts tests/unit/user-prefs.test.ts

# 컴포넌트 — CalendarView·TripDetailLayout·MobileSwipeShell
pnpm vitest run tests/components/trip/

# 통합 — derived 기간 갱신 시나리오
pnpm vitest run tests/integration/trip-derived-period.test.ts

# 타입 + lint
pnpm typecheck
pnpm lint

# MCP 시그니처 (Python)
cd mcp && uv run pytest tests/test_create_trip_signature.py
```

#### 수동 검증

* 시나리오 1: desktop·mobile 모두에서 일정 추가 후 헤더 즉시 갱신 (시각 확인). 새로고침 없이.
* 시나리오 2: 1440px·1280px·1024px viewport에서 split 노출 정합
* 시나리오 3: iPhone Safari·Chrome 모바일에서 좌 스와이프·뒤로 버튼 모두 동작. swap 1초 이내 (DevTools Performance tab으로 측정 가능)
* 시나리오 4: 동시 표시 여행 3건에서 라벨 색 충돌(WCAG AA 4.5:1) 시각 확인
* 시나리오 5: Claude Code에서 v2.x 잔존 코드(`startDate` 인자)로 호출 시 명확한 에러 + 안내 메시지

## 회귀 방지

* 외부 캘린더 import(Apple/Google → ActivityDraft) — derived 기간 기반으로 trip range 결정. 일정 0건 트립 import 시도 시 "기간 미정" 안내로 차단됨을 확인
* 공유 캘린더 push — 같은 derived 기간으로 push 범위 결정. push event 수가 derived 기간 일수와 일치 확인
