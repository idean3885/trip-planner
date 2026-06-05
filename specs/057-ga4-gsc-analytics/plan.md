# Implementation Plan: 사용자 분석(GA4)·검색 노출(GSC) + 캘린더 카피 간소화

**Branch**: `057-ga4-gsc-analytics` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/057-ga4-gsc-analytics/spec.md`

## Summary

공개 서비스의 사용 행태를 보기 위해 GA4를 도입한다(페이지뷰 + 핵심 전환 이벤트 + 익명 User-ID, 측정 ID 미설정 시 비활성). 검색 노출은 공개 페이지만 sitemap·색인하고 앱 본체는 noindex로 최소 등록한다. 함께 가져오기 다이얼로그 등 사용자 노출 카피에서 프로젝트 코드명과 기술·내부 설명을 제거한다. 도구 선택 근거(GA4 채택, PostHog/Amplitude 보류, 동적 앱에서 검색 노출 위치)는 ADR로 기록한다. 신규 유료 의존성 없음.

## Coverage Targets

- 가져오기 다이얼로그·안내 카피에서 코드명·기술 설명 제거 [why: copy-simplify] [multi-step: 2]
- GA4 분석 도입 — 페이지뷰 + 핵심 전환 이벤트 + 익명 User-ID, 측정 ID env 기반 조건부 [why: ga4-analytics] [multi-step: 3]
- 검색 노출 최소 — robots + sitemap(공개 페이지) + 소유 확인 메타 + 앱 본체 noindex [why: search-exposure] [multi-step: 3]
- 도구 선택 ADR + 환경변수·콘솔 작업 가이드 [why: adr-guide] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16, App Router)
**Primary Dependencies**: Next.js 16, React 19, Auth.js v5, Tailwind v4, shadcn/ui. **신규: `@next/third-parties`**(Next 공식 GA4 통합, 무료). 그 외 신규 없음
**Storage**: 변경 없음(분석 데이터는 외부 GA4로 적재, DB 스키마 무변경)
**Testing**: Vitest, Testing Library
**Target Platform**: Vercel(web), 모바일·데스크탑 브라우저
**Project Type**: web application (Next.js 풀스택 + Python MCP — MCP 영향 없음)
**Performance Goals**: 분석 태그는 `afterInteractive` 로드로 초기 렌더 영향 최소. 측정 ID 미설정 시 태그 0개
**Constraints**: 측정 ID·소유 확인값은 환경변수, 미설정 시 비활성. 신규 유료 비용 0(헌법 II). 사용자 화면에서 코드명 미노출
**Scale/Scope**: 분석 통합 1개소(루트 레이아웃) + 이벤트 호출 3개소 + robots/sitemap 2파일 + 카피 2~3컴포넌트 + ADR

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **II. Minimum Cost**: ✅ GA4·GSC 무료, `@next/third-parties` 무료 공식 패키지. 추가 과금 0.
- **III. Mobile-First**: ✅ 분석 태그는 비시각 요소. 카피 간소화는 모바일 가독성에 오히려 도움.
- **V. Cross-Domain Integrity**: ✅ 무관(분석은 관측 계층, 도메인 데이터 변경 없음).
- **VI. RBAC**: ✅ 무관(권한 행위 추가 없음). User-ID는 식별자 연결일 뿐 권한과 무관.
- **VII. Calendar Time Model**: ✅ 무관(시간 표시 변경 없음).
- **라이브러리 우선 원칙(ADR-0002)**: ✅ GA4 통합에 자체 구현 대신 Next 공식 `@next/third-parties` 채택.

위반 없음 — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/057-ga4-gsc-analytics/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/            # 분석 이벤트 계약(이벤트명·파라미터)
├── checklists/requirements.md
└── tasks.md              # /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                    # GA4 통합(GoogleAnalytics, 조건부) + verification 메타
│   ├── robots.ts                     # 신규 — 공개 allow / 앱 경로 disallow + sitemap 참조
│   ├── sitemap.ts                    # 신규 — 공개 페이지(/, /about, /docs)만
│   └── (인증 레이아웃)/               # 앱 본체 noindex 메타(robots index:false)
├── components/
│   ├── analytics/                    # 신규 — User-ID 연결 클라이언트 컴포넌트
│   └── calendar-sync/
│       ├── CalendarSyncDialog.tsx    # 카피 간소화 — 코드명 제거, 안내 박스 제거
│       └── sections/ImportSection.tsx # 빈 상태 안내 코드명 제거
├── lib/
│   └── analytics.ts                  # 신규 — 이벤트 전송 헬퍼(측정 ID 가드)
docs/
├── adr/                              # 신규 ADR — 분석·검색노출 도구 선택
└── (운영 가이드)                      # 측정 ID·GSC 발급·env 등록 가이드
.env.example                          # NEXT_PUBLIC_GA_ID, 검색 소유 확인값 추가
```

**Structure Decision**: 기존 Next.js 구조 유지. 분석은 루트 레이아웃 1개소 통합 + 헬퍼/이벤트 호출, 검색 노출은 App Router 규약 파일(robots.ts/sitemap.ts) + 메타데이터. 카피는 활성 노출 컴포넌트(CalendarSyncDialog·ImportSection)만 수정하며, 레거시·미노출 컴포넌트(AppleConnectWizard·CalendarImportPanel·내부 상수)는 사용자 화면에 노출되지 않으므로 범위 밖(spec Edge Case).

## Complexity Tracking

> Constitution Check 위반 없음 — 작성 불필요.
