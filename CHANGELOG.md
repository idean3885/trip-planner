# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

릴리즈 노트는 [towncrier](https://github.com/twisted/towncrier)가 `changes/` 단편 파일을 모아 자동 생성합니다. 단편 작성 가이드는 [`changes/README.md`](changes/README.md) 참조.

<!-- towncrier release notes start -->

## [2.11.0] - 2026-04-28

### Added

- **Apple iCloud CalDAV 라우트 3종 + service `connectAppleCalendar` 분기 추가**. 왜: 위자드(다음 PR) 진입점 — 자격증명 검증·캘린더 목록·trip 연결 모두 capability "manual" 분기로 멤버 ACL 자동 호출 0회 보장 + manualAclGuidance 안내. ([#417-routes](https://github.com/idean3885/trip-planner/issues/417-routes))
- **Apple iCloud CalDAV sync 분기 추가** — `syncAppleActivities` 모듈 + `service.syncCalendar`의 `link.provider="APPLE"` 분기. 왜: US1(첫 sync) MVP 완성 — Apple link로 연결한 trip의 활동이 iCloud 캘린더에 VEVENT로 반영되어 iPhone Calendar 앱에 표시. Google sync는 그대로 유지(회귀 0). ([#417-sync](https://github.com/idean3885/trip-planner/issues/417-sync))
- **Apple 캘린더 연결 위자드 UI 추가** — `/trips/{id}/calendar/connect-apple` 진입 페이지 + `AppleConnectWizard` 4단계 stepper(사전 확인·가이드·입력 검증·완료) + 재인증 모드(`?apple_reauth=1`). 왜: POC #345의 사용자 가이드를 위자드 형태로 구현 — Apple 사용자가 16자리 앱 암호를 발급·입력하고 자동으로 캘린더가 생성·연결되는 일관 흐름 제공. ([#417-wizard](https://github.com/idean3885/trip-planner/issues/417-wizard))
- **Apple iCloud CalDAV provider 토대 도입** — `appleProvider` 객체, AES-256-GCM 암호화 모듈, `tsdav` 라이브러리 wrapper, ICS VEVENT 변환, `AppleCalendarCredential` 신규 테이블. 왜: 두 번째 캘린더 provider 정식 도입의 토대 — 위자드·라우트·sync 분해는 후속 PR로 분리해 회귀 위험을 단계적으로 관리. ([#417](https://github.com/idean3885/trip-planner/issues/417))

### Documentation

- **Apple iCloud CalDAV provider 정식 피처 spec/plan/tasks 작성** + POC #345 결과물(연구·가이드·스크린샷) 정식 docs/ 편입. 왜: 다음 단계(구현) 전 의사결정 봉합 + 검증 시나리오 합의를 위해 spec PR을 별도로 분리. ([#417](https://github.com/idean3885/trip-planner/issues/417))

### Chore

- **v2 캘린더 라우트 4종을 service 위임으로 슬림화**하고 오너 이관 ACL 정리를 service 모듈로 분리. 왜: provider 추상화 잔여 작업 — 라우트는 인증·파싱만 담당하고 권한·DB·외부 호출은 service에 캡슐화해 후속 #417 Apple 추가 비용을 줄인다. ([#416](https://github.com/idean3885/trip-planner/issues/416))


## [2.10.3] - 2026-04-27

### Fixed

- **자동 sync 워크플로우 PR 생성 권한 fix**: `secrets.AUTO_TAG_PAT` → `secrets.GITHUB_TOKEN` 교체. 왜: PAT에 `pull-requests: write` 미부여로 v2.10.2 첫 발효에서 PR 생성 단계만 실패. workflow의 `permissions: pull-requests: write`가 GITHUB_TOKEN에 자동 적용되어 PAT 의존 제거. ([#425](https://github.com/idean3885/trip-planner/issues/425))


## [2.10.2] - 2026-04-27

### Added

- **멤버 라이프사이클 ACL 동기화에 retain 판정 도입**: 같은 외부 캘린더를 다른 활성 여행이 공유 중일 때, 한 여행의 멤버가 빠져도 그 멤버의 캘린더 ACL은 회수 보류된다(다른 여행 시청 보호). 왜: spec 024 추상화의 첫 가치 표현. 기존 v2.10.x는 무조건 회수해 다른 여행에서 보던 캘린더가 끊어질 수 있던 잠재 회귀를 구조적으로 차단. ([#416](https://github.com/idean3885/trip-planner/issues/416))

### Fixed

- **`GCalLinkPanel` 미등록 분기 테스트 flaky 안정화**: CI coverage 환경에서 base-ui Dialog portal 마운트 지연으로 timeout이 부족하던 단위 테스트의 timeout을 늘림. 사용자 가시 변경 0. 왜: PR #418/#419 머지 시 develop CI에서 일관 실패 → 재실행으로만 통과되던 패턴을 구조적으로 해소. ([#420](https://github.com/idean3885/trip-planner/issues/420))

### Documentation

- **WORKFLOW 현실화 + main→develop 자동 sync 워크플로우 도입**: v2.7.0 이후 정착된 `release/* → main 직접 머지` 패턴을 CLAUDE.md·docs/WORKFLOW.md에 명문화하고, release 머지 직후 sync PR을 자동 생성하는 GitHub Actions(`sync-main-to-develop.yml`)를 추가. 왜: 매 릴리즈마다 main이 develop보다 앞서고, 누군가 수동으로 sync PR을 만들지 않으면 다음 작업이 누락 베이스 위에서 시작되는 구조적 마찰이 반복됐다. ([#413](https://github.com/idean3885/trip-planner/issues/413))

### Chore

- **캘린더 provider 추상화 — Google 구현체 채움 + service skeleton**: Foundation의 인터페이스 stub을 실제 구현으로 교체. `googleProvider`의 인증·캘린더 관리·멤버 ACL·에러 분류(6종 vocabulary) 메서드가 기존 `src/lib/gcal/*` 함수에 위임. retain 판정(다른 여행에서 같은 캘린더 활성 사용 중이면 ACL 회수 보류) 도입. 라우트 위임 교체는 후속 PR로 분리해 회귀 검증 단순화. 왜: 후속 Apple 도입(#417) 시 같은 인터페이스에 Apple 구현체만 추가되도록 토대를 단계적으로 채운다. ([#416](https://github.com/idean3885/trip-planner/issues/416))


## [2.10.1] - 2026-04-27

### Fixed

- **캘린더 패널 "상태를 불러오지 못했습니다" 회귀 수정**: v2.10.0(spec 022)에서 폐기한 레거시 status 라우트를 클라이언트가 계속 호출하던 문제를 v2 엔드포인트로 마이그레이션. 왜: 호스트·게스트가 캘린더 연결 상태와 추가 버튼을 전혀 볼 수 없었다. ([#410](https://github.com/idean3885/trip-planner/issues/410))

### Documentation

- **문서·스펙·도메인 정합성 정리**: ERD/DOMAIN에 캘린더 컨텍스트(v2.9.0+) 추가 + Day.sortOrder 잔존 표기 제거, spec 015~023 메타를 실제 릴리즈 버전으로 갱신, glossary 복수 역할 뱃지·캘린더 이원 표기 보강, ADR 0005 expand-and-contract 패턴 신설. 왜: v2.10.0 직후 문서가 코드 현실과 어긋나 후속 작업의 베이스 신뢰가 떨어졌다. ([#407](https://github.com/idean3885/trip-planner/issues/407))


## [2.10.0] - 2026-04-23

### Added

- 이벤트 매핑을 공유 캘린더에 직접 귀속하도록 재설계. 왜: 기존 per-user bridge 재사용 로직이 혼선·중복 데이터의 원천이었다. 레거시 테이블·라우트는 무중단 배포를 위해 남기고 후속 릴리즈에서 drop 예정. ([#402](https://github.com/idean3885/trip-planner/issues/402))
- 동행자 목록의 주인 항목에 "주인"+"호스트" 두 뱃지를 병렬 표시. 왜: 주인이 호스트 권한을 포함한다는 역할 계층이 UI에 드러나지 않아 혼선이 있었다. ([#403](https://github.com/idean3885/trip-planner/issues/403))


## [2.9.2] - 2026-04-22

### Added

- 구글 캘린더 연동이 개발자 등록 사용자에게만 제공되는 사실을 UI·문서에 정직하게 전달. 왜: 심사 전 단계라 미등록 사용자가 일반 실패 토스트만 보고 원인·해결을 몰랐다. ([#399](https://github.com/idean3885/trip-planner/issues/399))

### Documentation

- 과한 Evidence 요구 경량화. 왜: 템플릿 규약은 자동 테스트 OR 수동 체크리스트 최소 하나이며 스크린샷·모바일 device mode·1주 운영 로그는 과한 정형화였다(1인 개발 전제). ([#395](https://github.com/idean3885/trip-planner/issues/395))


## [2.9.1] - 2026-04-22

### Added

- 주인이 공유 캘린더를 아직 연결하지 않은 여행에서 호스트·게스트에게도 같은 위치에 안내 전용 다이얼로그를 제공. 왜: 이전에는 작동하지 않는 "내 구글 캘린더에 추가"·"다시 반영하기" 버튼이 노출돼 404 오류가 발생했다. ([#395](https://github.com/idean3885/trip-planner/issues/395))


## [2.9.0] - 2026-04-22

> 이번 릴리즈부터 각 엔트리는 **What** (한 줄 요약) + **Why** (배경 1줄)로 단순화.

### Breaking

- **여행당 1개 공유 캘린더 모델**로 전환. 왜: v2.8.0은 멤버마다 개인 캘린더를 만들어 여행 1개에 N개 중복 생성됐다. v2.8.0 오너 캘린더는 자동 승격 재사용, 다른 멤버 캘린더는 앱 내 연결 해제. 레거시 API는 다음 릴리즈에서 제거. ([#355](https://github.com/idean3885/trip-planner/issues/355))

### Added

- **오너 공유 캘린더 연결 API** (`POST/DELETE /api/v2/trips/{id}/calendar`). 왜: 연결 시 현재 멤버 전원에게 역할별 ACL을 서버가 한 번에 부여. ([#356](https://github.com/idean3885/trip-planner/issues/356))
- **멤버 라이프사이클 ACL 자동 동기화**. 왜: 가입·역할 변경·탈퇴·오너 이관 시점에 서버가 자동으로 ACL을 맞춰, 오너의 수동 조작 없이 권한 일관성 유지. ([#357](https://github.com/idean3885/trip-planner/issues/357))
- **멤버 수동 subscribe 엔드포인트** (`POST/DELETE /api/v2/trips/{id}/calendar/subscribe`). 왜: "안 쓸 자유"를 보장하면서 필요한 멤버만 옵트인으로 본인 GCal에 띄우도록. ([#358](https://github.com/idean3885/trip-planner/issues/358))
- **공유 캘린더 sync 엔드포인트** (`POST /api/v2/trips/{id}/calendar/sync`). 왜: 오너 토큰 1개로만 쓰기가 들어가 중복 이벤트가 원천 차단. ([#359](https://github.com/idean3885/trip-planner/issues/359))
- **역할별 트립 페이지 UI**. 왜: 오너는 연결/sync/해제, 멤버는 내 캘린더 추가/제거만 보여 조작 실수와 혼선을 최소화. ([#360](https://github.com/idean3885/trip-planner/issues/360))

### Documentation

- **ADR 0003 — 여행당 1개 공유 캘린더**. 왜: 모델 선택·거절된 대안·후속 contract 타임라인을 한 곳에 고정. ([#363](https://github.com/idean3885/trip-planner/issues/363))

### Fixed

- **v2.8.0 트립의 멤버 ACL 자동 복구**. 왜: 백필 SQL은 Google API를 호출하지 못해 ACL이 누락됐고, 오너가 "다시 반영하기"를 누르면 sync 전에 ACL을 idempotent하게 복구하도록 했다.
- **subscribe 동의 복귀 후 자동 재시도**. 왜: `?gcal=subscribed` 쿼리를 auto-retry 화이트리스트에 추가해 "한 번 더 누르기" 수고 제거.
- **"건너뛴 이벤트" 카운터 누적 버그**. 왜: sync마다 누적되던 `skippedCount`를 현재 run의 실제 값으로 덮어쓰도록 변경.
- **subscribe 성공 후에도 안 바뀌는 UX**. 왜: 상태 응답에 `mySubscription`을 추가해 ADDED 상태면 컴팩트 카드(오너 "연결됨" 카드와 동일 톤)로 전환.
- **412 오탐으로 앱 편집이 Google에 안 밀리는 문제**. 왜: 412 시 **컨텐츠 비교 → 타임스탬프 비교** 순서로 판정해, 진짜 사용자 GCal 편집일 때만 `skipped`로 남긴다.
- **호스트가 본인 편집을 sync 트리거 못 하던 문제**. 왜: 호스트도 트립 편집 권한이 있으므로 "다시 반영하기"를 쓸 수 있도록 확장(서버는 오너 토큰으로 수행).

### Fixed

- **v2.8.0 마이그레이션 트립의 멤버 ACL 자동 복구 + 동의 후 자동 subscribe**: 백필 SQL은 DB의 TripCalendarLink 승격만 수행하고 Google 쪽 ACL 부여는 하지 못하므로, 승격된 트립에서 멤버가 "내 구글 캘린더에 추가"를 눌러도 404로 실패하는 문제를 해소. 오너가 "다시 반영하기"를 누르면 sync 전에 현재 멤버 전원에게 ACL을 idempotent하게 upsert해 Google 쪽 권한을 복구한다. 또 멤버가 subscribe 시 calendar scope 동의를 완료하고 돌아오면 자동으로 subscribe가 재시도되도록 `?gcal=subscribed` 쿼리를 auto-retry 대상에 추가.
- **"직접 수정하여 건너뛴 이벤트" 카운터가 누적되는 문제**: sync를 누를 때마다 동일 이벤트가 반복 카운트되어 숫자가 선형 증가하던 버그 수정. 이번 sync의 실제 건너뛴 수로 덮어쓰도록 변경(v2 sync·v1 sync·v1 link 모두). 사용자 직접 수정 이벤트가 해결되면 다음 sync에서 자동으로 0으로 리셋된다.
- **멤버 "내 구글 캘린더에 추가" 후에도 버튼·안내문이 그대로 유지되던 UX 이슈**: 상태 응답에 본인 subscription 상태(`mySubscription`)를 함께 반환하고, 패널은 `ADDED` 상태면 "내 캘린더에 추가됨" 배지 + "제거" 단일 버튼의 컴팩트 카드로 전환한다. 오너 쪽 "연결됨" 카드와 동일한 톤.
- **412 Precondition 처리 개선 — "건너뛴 이벤트"의 오탐 제거**: 412 시 Google 현재 이벤트의 **컨텐츠(summary·description·location·start·end)**를 우리가 설정하려는 값과 먼저 비교한다. 같으면 ETag만 밀린 상태로 판단해 조용히 갱신(`updated`). 다를 때만 Google `updated`와 `lastSyncedAt`을 비교하여, 우리 앱 편집이면 재-patch로 밀고 Google 편집이면 `skipped`로 보존. 결과적으로 "사용자가 GCal에서 직접 수정한 경우에만" skipped에 잡힌다.

### Chore

- **레거시 status 라우트가 공유 모델 응답으로 어댑트**. 왜: 기존 MCP 클라이언트가 v2.9.0 이후에도 같은 응답 형식을 받도록 뒤호환 유지. ([#361](https://github.com/idean3885/trip-planner/issues/361))
- **quickstart Evidence 섹션 충족**. 왜: PoC 실측(#349) + 피처 PR CI를 증거로 연결, 통합 테스트는 별도 후속 이슈로 분리. ([#362](https://github.com/idean3885/trip-planner/issues/362))


## [2.8.0] - 2026-04-21

### Added

- Day 모델 구조적 재설계 — `dayNumber`를 `(date - trip.startDate) + 1`로 파생하는 자연키 모델로 전환. `Trip.startDate`/`endDate` NOT NULL + `Day(@@unique([tripId, date]))` 제약 추가. Day POST/PUT 시 Trip 범위 밖 date면 Trip 범위가 자동 확장된다. expand-and-contract 패턴의 expand+migrate 단계, contract(`sortOrder` 컬럼 DROP)는 #317에서 후속 트래킹. ([#296](https://github.com/idean3885/trip-planner/issues/296))
- API 버저닝 v1 유지 + v2 신설 (`/api/v2/trips/...`). v1 응답 스키마는 무변경(MCP 호환), v2는 `dayNumber` 중심 응답. 웹 UI는 v2로 전환되며 MCP는 v1 그대로 사용. SemVer 관점: 외부 계약 추가만 있으므로 MINOR. ([#304](https://github.com/idean3885/trip-planner/issues/304))
- **Google Calendar 연동 도입(1차)**: 여행 상세 페이지에서 "구글 캘린더에 올리기" 한 번으로 본인 Google Calendar에 여행 활동을 이벤트로 export/갱신/삭제할 수 있다. 동일 여행 재반영 시 중복 이벤트가 생기지 않고, 사용자가 구글 캘린더에서 직접 수정한 이벤트는 ETag 불일치로 감지해 덮어쓰지 않고 "건너뜀"으로 고지한다. 공유 여행에서는 각 멤버가 본인 계정으로만 실행하며 타 멤버 캘린더를 자동 변경하지 않는다. 기존 iCal 경로(`che-ical-mcp`)는 변경 없이 공존한다. Resolves #150. ([#305](https://github.com/idean3885/trip-planner/issues/305))

### Fixed

- v2.7.0 expand-and-contract 패턴의 contract 단계 — `Day.sortOrder` 컬럼을 DB에서 제거. v1 응답(`/api/trips/...`)의 `sortOrder` 키는 dayNumber 동적 계산으로 그대로 응답되어 MCP 호환 100% 유지. 데이터 손실 없음(컬럼 값은 모두 `(date - trip.startDate) + 1`로 정확히 복원 가능). ([#317](https://github.com/idean3885/trip-planner/issues/317))
- **활동 시간 표기 개선**: `13:00 GMT+9` 대신 `13:00 KST`, `20:15 WEST`처럼 지역 친화 약어로 표시. 주요 IANA 존 화이트리스트 + DST 반영(여름/겨울 다른 약어). 화이트리스트 밖이거나 ICU가 약어를 못 주는 경우 도시명으로 폴백. ([#325](https://github.com/idean3885/trip-planner/issues/325))
- **#318 DB 분리 이후 stale JWT 세션으로 인한 여행 생성 실패 수정**: `neondb` / `neondb_dev` 분리 이전에 발급된 쿠키를 가진 사용자는 새 DB에 존재하지 않는 `user.id`를 세션에 담고 있어 `POST /api/trips`에서 `Trip.createdBy` FK 위반(Prisma P2003)으로 실패했다. Auth.js `jwt` 콜백에서 토큰 userId의 DB 실존을 검증하고 없으면 세션을 무효화하여 자동 재로그인 흐름으로 유도한다. 향후 DB 이관·초기화 상황에서도 재발하지 않는 구조적 가드. ([#328](https://github.com/idean3885/trip-planner/issues/328))
- **Stale Auth.js 쿠키로 인한 OAuth 재시작 꼬임 방어 (#329 후속)**: `#328`의 JWT 가드가 세션을 무효화해도 `pkce.code_verifier` / `state` / `callback-url` 같은 Auth.js 부수 쿠키가 브라우저에 남아, 재로그인 흐름이 Google OAuth 중간 단계에서 꼬이거나 엉뚱한 URL로 리디렉트되는 현상을 확인. middleware가 비로그인 판정 시 해당 쿠키 존재 여부를 확인하고, 남아 있으면 리디렉트 응답에서 `Max-Age=0`으로 즉시 정리한다. `/auth/signin` 진입 시 `?stale=1` 쿼리가 붙으면 "이전 세션이 유효하지 않아 자동으로 정리했습니다" 안내를 노출. 사용자에게 "쿠키를 직접 지우세요"를 요구하지 않아도 되도록 구조적으로 방어한다. ([#330](https://github.com/idean3885/trip-planner/issues/330))
- **Auth.js 재동의 후 Account.scope 동기화로 GCal consent 루프 해소 (#332)**: `@auth/prisma-adapter`가 기존 Account row가 있을 때 `linkAccount`를 호출하지 않아 재로그인 시 새로 받은 `access_token` / `refresh_token` / `scope` / `expires_at`이 DB에 반영되지 않는 알려진 동작이 있다. GCal `calendar.events` scope 증분 동의 성공 후에도 DB의 `Account.scope`가 옛 값이어서 `hasCalendarScope()`가 계속 false → 다시 consent → 무한 루프. `signIn` 콜백에서 OAuth Account를 직접 updateMany로 upsert해 재동의 결과가 항상 DB에 반영되도록 한다. 보조로 `GCalLinkPanel`의 자동 재시도에 `sessionStorage` 기반 1회 제한을 두어, 혹시 다시 consent_required가 떠도 사용자가 빠져나올 수 있게 한다. ([#332](https://github.com/idean3885/trip-planner/issues/332))
- **구글 동의 화면 취소 시 "Server error" 대신 친절한 안내 (#334)**: Google OAuth 동의 화면에서 사용자가 "취소"하면 Google이 `iss` 없는 error 응답을 보내고 Auth.js v5가 이를 Configuration 에러로 승격, 기본 `/api/auth/error` 페이지의 "Server error" 문구로 이어지는 UX 회귀가 있었다. `auth.config.ts`에 `pages.error = "/auth/signin"`을 지정해 에러 시점에도 signin 페이지로 라우팅하고, signin 페이지가 `?error=<code>`를 해석해 "로그인을 취소했습니다. 다시 시도해 주세요" 같은 맥락 안내를 노출. 사용자가 취소한 동작이 서버 에러 화면으로 보이지 않는다. ([#334](https://github.com/idean3885/trip-planner/issues/334))
- **로그아웃 후 stale 오탐 + GCal 자동재시도 플래그 영구 잔존 수정 (#337)**: middleware의 stale 쿠키 감지 대상에서 `callback-url`을 제외하여 정상 로그아웃 흐름에서 "이전 세션이 유효하지 않아 자동으로 정리했습니다" 안내가 오탐되지 않도록 수정. 진짜 stale 신호는 `session-token`만으로 한정하고, session-token이 감지되면 PKCE/state 부수 쿠키도 함께 정리해 OAuth 재시작 꼬임은 그대로 방어. 추가로 `GCalLinkPanel`이 link/sync 성공 시 sessionStorage의 자동재시도 가드 플래그를 제거해, 한 번 consent 루프를 돌고난 뒤에도 이후 시도가 "루프 감지"로 오판되지 않도록 한다. ([#337](https://github.com/idean3885/trip-planner/issues/337))
- **여행 상세에 '일정 추가' 버튼 복원 (#339)**: Trip 생성 직후 Day가 0개인 상태에서 Day를 추가할 UI가 없어 Activity/GCal 연동 흐름 전체가 막혀 있던 UI 갭을 해소. `AddDayButton` 컴포넌트를 추가하고 여행 상세의 '일정' 섹션 헤더에 OWNER/HOST 한정으로 노출한다. date input에 Trip 범위를 `min`/`max`로 제공하되, 범위 밖 날짜 입력 시에는 서버가 Trip 범위를 자동 확장하는 기존 동작(#296)을 그대로 활용한다. ([#339](https://github.com/idean3885/trip-planner/issues/339))
- **Activity 저장 시 브라우저 IANA 타임존 자동 주입 (#341)**: `ActivityList`의 handleCreate/handleUpdate가 body에 `startTimezone`/`endTimezone`을 포함하지 않아 DB에 항상 null로 저장되어 `ActivityCard`가 KST 등 타임존 약어를 표시할 수 없었다(#325 표시 포맷 개선의 사각지대). `Intl.DateTimeFormat().resolvedOptions().timeZone`으로 감지한 브라우저 IANA 값을 startTime/endTime과 함께 전송하여 이후 표시 단계에서 약어(KST/WEST 등)가 정상 렌더되도록 한다. ([#341](https://github.com/idean3885/trip-planner/issues/341))
- **GCal scope를 `calendar.events` → `calendar` 전체로 확장해 DEDICATED 모드 복구 (#343)**: `calendars.insert`(전용 캘린더 자동 생성)는 `calendar` 또는 `calendar.app.created` scope를 요구해 기존 `calendar.events` 단독으론 403으로 실패하던 UX를 해소. Testing 모드에서는 Test users 한정 운영이라 scope 확대가 외부 악용 경로를 넓히지 않는다는 판단(유료 Production 승급 보류 유지). 기존에 `calendar.events`로 동의해 둔 사용자는 `hasCalendarScope`가 legacy 값을 여전히 유효 권한으로 인정해 즉시 재동의를 강요받지 않는다. 다만 DEDICATED를 쓰려면 재동의가 한 번 필요. ([#343](https://github.com/idean3885/trip-planner/issues/343))

### Chore

- Neon DB 환경별 분리 — Production은 `neondb`, Preview/Development는 신설한 `neondb_dev`로 분리. Vercel env 변수 `DATABASE_URL` 등 8종을 스코프별로 분기 설정. 향후 PR preview build의 `prisma migrate deploy`는 `neondb_dev`에만 적용되어 prod 영향 0 (expand-and-contract 패턴의 preview-build-timing 위험 구조적 해소). ([#318](https://github.com/idean3885/trip-planner/issues/318))


## [2.6.0] - 2026-04-20

### Added

- 공개 랜딩 페이지(`/`)를 신설하고 README·`docs/`를 외부 방문자 친화적으로 재정돈합니다. 비로그인 방문자가 프로젝트 정체성·핵심 가치·기능·기술 스택·실제 UI 미리보기·시작 CTA를 한 페이지로 훑을 수 있고, 루트 README는 독자 3층(외부 방문자·기여자·운영) 진입점으로 개편됐습니다. 기존 대시보드(여행 목록)는 `/trips`로 이관됐습니다. (#313) ([#313](https://github.com/idean3885/trip-planner/issues/313))


## [2.5.0] - 2026-04-20

### Added

- 디자인 시스템 Phase 2. 복합 컴포넌트(`ActivityCard`·`ActivityList`·`DayEditor`) 외곽과 주요 페이지(홈·여행 상세·Day 상세·`MemberList`·설정·새 여행·로그인·초대·API 문서)를 shadcn `<Card>` + `<Button>` + `<Tabs>` + semantic 토큰 기반으로 정식 전환했습니다. 레거시 커스텀 유틸리티(`rounded-card`/`shadow-card*`/`shadow-fab`/`bg-primary-*`·`bg-surface-*`/`text-surface-*`/`text-heading-*`/`text-body-*`/`max-w-content`)를 `src/**`·`styles/**`·`design/tokens.json`·`globals.css` `@theme` 블록에서 전면 제거하고, `scripts/check-legacy-utilities.sh` + `scripts/audit-tokens.ts` + CI design-system job으로 재유입을 구조적으로 차단했습니다. Day 상세에서 Prisma `Decimal` 타입이 Server → Client 경계로 그대로 넘어가 Next 16 strict 검사에 걸리던 문제를 `cost.toString()` 직렬화로 해소했습니다(#300). 브랜드 컬러·Latin 폰트 교체·다크 모드는 도입하지 않았으며, semantic 토큰은 shadcn 기본값(neutral)을 유지하여 디자이너 합류 시 `tokens.json`만으로 반영 가능한 상태로 둡니다. ([#301](https://github.com/idean3885/trip-planner/issues/301))
- About 페이지(`/about`)를 일반 사용자 관점으로 재작성. 앱 이름을 **우리의 여행**으로 통일(레포 이름 `trip-planner`는 부차 정보), 문장 톤은 합쇼체로 정합. 기술 스택 나열 섹션은 제거하고, 아키텍처·개발 가이드는 GitHub `docs/` 허브와 `ARCHITECTURE.md`로 분리해 내부 카드 링크로 연결. 유니코드 화살표(↗·→)를 lucide 아이콘(`ExternalLink`, `ArrowRight`, `BookOpen`, `Layers`)으로 교체하고, 전체 레이아웃을 shadcn `<Card>` 기반 semantic 토큰 체계에 맞춰 재구성. ([#306](https://github.com/idean3885/trip-planner/issues/306))

### Documentation

- 문서 허브(`docs/README.md`) 네비게이션을 정비. `audits/`·`evidence/`·`research/` 하위 디렉토리 색인 추가, 운영·환경(`ENVIRONMENTS.md`)·v1 역사 스펙(`spec.md`) 섹션 보강. `DEVELOPMENT.md`의 "Squash and merge" 레거시 표기를 현행 정책(`Create a merge commit`)으로 정합화. 기술 스택 표를 Tailwind v4 + shadcn vendored 기준으로 최신화. ([#307](https://github.com/idean3885/trip-planner/issues/307))


## [2.4.4] - 2026-04-19

### Fixed

- **DAY 0 노출 해소 — sortOrder 데이터 보정 + API 자동 채번**: 기존 DB의 `Day.sort_order = 0` 레코드들을 1회성 마이그레이션(`20260419140000_backfill_day_sortorder_285`)으로 각 Trip별 `date ASC` 순 1~N 재번호. POST/PUT/DELETE `/api/trips/:id/days`는 이제 `sortOrder`를 서버가 자동 관리하며 클라이언트 값은 무시. `src/lib/day-order.ts`의 `resortDaysByDate(tx, tripId)`가 transaction 내에서 전체 재정렬을 수행하여 중간 삽입·날짜 변경·삭제 후에도 DAY 1부터 순서 보장. Day.sortOrder 컬럼 폐기 등 구조적 재설계는 별도 [#296](https://github.com/idean3885/trip-planner/issues/296) (v2.5)에서 무중단으로 진행. ([#285](https://github.com/idean3885/trip-planner/issues/285))
- **활동 생성/수정/삭제 실패 시 에러 토스트 표시**: 이전엔 API 실패가 async throw로 unhandled rejection 발생(Vitest 4 + GitHub Actions reporter에서 `##[error]` 집계로 CI test step을 fail시키는 2차 피해). 이제 `ActivityList`의 3종 handler가 `try/catch`로 감싸 `sonner` 토스트(`toast.error("활동 … 에 실패했습니다")`)로 사용자에게 알리고 조용히 복귀. 테스트도 throw 기대 → toast 호출 관찰로 재설계. `.github/workflows/ci.yml`의 test step은 `continue-on-error`를 제거하여 blocking 게이트로 전환. ([#294](https://github.com/idean3885/trip-planner/issues/294))

### Chore

- **마크다운 trips fallback dead code 전면 제거**: DB가 여행 데이터 정본(#239 이후)이라 `trips/` 디렉토리는 이미 삭제된 상태였고, `src/lib/trips.ts`와 여행/일자 페이지의 `MarkdownTripPage`/`MarkdownDayPage` 분기는 실행되지 않는 dead code로 남아 있었다. 파일·분기·`gray-matter` 의존성 전체 제거. DB path의 `remark` 기반 마크다운 렌더는 유지. 페이지 라우트는 이제 `isNaN(id)` 시 `notFound()`로만 처리. ([#269](https://github.com/idean3885/trip-planner/issues/269))
- **speckit tasks.md artifact 태그 포스트 릴리즈 정합성 개선**: v2.4.3 릴리즈 시 towncrier가 `changes/*.md` 단편을 `CHANGELOG.md`로 합산·삭제한 뒤 drift validator가 "체크됐으나 artifact 부재" 에러를 냄. T035의 `[artifact]` 태그를 `CHANGELOG.md::v2.4.3`으로 갱신해 릴리즈 후에도 drift audit 통과. ([#270](https://github.com/idean3885/trip-planner/issues/270))
- **Coverage threshold 100/95 복원 + CI blocking 전환**: develop baseline(Lines 99.09% / Branches 91.2% / Statements 99.09%) 대비 12건의 신규·보강 테스트 추가(POST/PUT/DELETE 분기 조합, ActivityList 네트워크 reject 토스트, 다수 activity 중 단일 업데이트, 비용 parseFloat truthy 분기 등). UI에서 렌더된 activity id만 `handleMove`에 전달되고 `ActivityCard.isFirst/isLast`가 경계 버튼을 숨기는 등 도달 불가능한 방어 경로 2건은 `c8 ignore` 주석으로 근거 명시. 최종 커버리지 Lines/Statements/Functions 100% · Branches 96.51%. `.github/workflows/ci.yml`의 `test:coverage` step은 `continue-on-error` 제거하여 blocking 게이트로 전환, 앞으로 threshold 미달 PR은 CI 차단. ([#282](https://github.com/idean3885/trip-planner/issues/282))
- **CI에 lint/typecheck/test 게이트 추가**: `.github/workflows/ci.yml` 신설. PR과 develop push 단계에서 `npm run lint`(blocking) / `npx tsc --noEmit`(blocking)는 즉시 차단 게이트로, `npm test`와 `npm run test:coverage`는 기존 tech debt(각각 #294 unhandled rejection, #282 coverage threshold) 때문에 우선 non-blocking(`continue-on-error`)으로 둔다. 해당 추적 이슈 해결 후 차례대로 blocking 전환. Node 20 matrix. 이전에 누적된 baseline lint error(`tailwind.config.ts` `require()`)는 v2.4.3 shadcn 도입으로 config 파일 자체가 사라지면서 자연 해소됨. ([#286](https://github.com/idean3885/trip-planner/issues/286))


## [2.4.3] - 2026-04-19

### Added

- **디자인 시스템 기반(shadcn/ui) + 폼 마이그레이션 + 디자이너 핸드오프 파이프라인**: `src/components/ui/`에 shadcn 12종(button·input·label·field·card·dialog·dropdown-menu·select·separator·skeleton·sonner·tabs) vendoring, 기존 폼 6종(ActivityForm·AuthButton·DeleteTripButton·LeaveTripButton·InviteButton·TodayButton)을 shadcn 기반으로 마이그레이션. `window.confirm` → `Dialog`, `alert()` → `toast` 전환으로 접근성·포커스 트랩·상태 일관성 확보. 서버 API fetch·props 시그니처 1:1 보존(헌법 V). 라이트 단독(shadcn `.dark` 블록 제거, `@custom-variant dark`만 남겨 런타임 inert). 디자이너 핸드오프 파이프라인: `design/tokens.json`(W3C DTCG) + `scripts/build-tokens.ts`(자체 flatten, 멱등) + `npm run tokens:build` + GitHub Issue Forms 템플릿 `🎨 Designer Handoff`(필수 필드 6종). 개발 전용 컴포넌트 카탈로그 `/components` 신설(`(dev)` route group + 프로덕션 `notFound()`). 신규 의존성: `@base-ui/react`, `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tw-animate-css`, `sonner`. ([#270](https://github.com/idean3885/trip-planner/issues/270))

### Documentation

- **업무 프로세스 단일 정본 도입**: `docs/WORKFLOW.md`(팀 구성·이슈 흐름·릴리즈·디자이너 협업·AI 에이전트·마일스톤·핫픽스 7 섹션) + `docs/design-handoff.md`(디자이너 핸드오프 상세 절차) 신설. `docs/README.md`·`CLAUDE.md`·루트 `README.md`에서 1홉 진입 링크 추가. CLAUDE.md는 AI 에이전트 1차 컨텍스트로 역할 축소하고 WORKFLOW.md에 권위 위임. v2.4.3 디자인 시스템 기반(#270) 마일스톤의 PR5(업무 프로세스 문서) 몫. ([#270](https://github.com/idean3885/trip-planner/issues/270))

### Chore

- **Tailwind CSS v3 → v4 CSS-first 전환**: `@tailwind` 3지시어를 `@import "tailwindcss"` + `@theme` 블록으로 교체. `tailwind.config.ts` 삭제, PostCSS 플러그인을 `@tailwindcss/postcss` 단일 구성으로 단순화(autoprefixer 내장). 기존 색상 팔레트·그림자·반경 토큰을 CSS 변수로 1:1 포팅. `.prose` 계열 규칙과 `@apply` 사용처는 그대로 유지. Next 16 빌드에서 tsconfig.json의 `jsx: preserve → react-jsx` 자동 재구성 결과 반영. ([#250](https://github.com/idean3885/trip-planner/issues/250))
- **speckit hook worktree-aware 개선**: `.specify/scripts/bash/enforce-submit.sh`와 `clear-submit-mark.sh`가 이제 `cd <path> && git commit` 형태의 bash command에서 `cd` 타깃을 추출해 해당 worktree에서 git 판정을 수행한다. 이전엔 hook 실행 cwd(=main worktree)만 기준이라 main worktree가 feature 브랜치 상태면 다른 worktree의 commit까지 차단되던 버그 해소. CLAUDE.md "워크트리 분기 + AI 병렬" 전제가 실제로 작동. ([#287](https://github.com/idean3885/trip-planner/issues/287)) ([#287](https://github.com/idean3885/trip-planner/issues/287))


## [2.4.2] - 2026-04-19

### Chore

- **Next.js 15 → 16 업그레이드**: 프레임워크 메이저 버전업. 현재 프로젝트가 App Router 기본 패턴만 사용하여 breaking change 대응 코드 변경 없음. `next-auth@5.0.0-beta.31` peer(`next: ^14 || ^15 || ^16`)와 호환. `npx tsc --noEmit`·테스트 152개 전부 통과. `dependabot.yml` next ignore 블록 제거. **런타임 검증은 Vercel Preview 빌드 결과로 확인 필요**. ([#249](https://github.com/idean3885/trip-planner/issues/249))
- **TypeScript 5.9 → 6.0 업그레이드**: 컴파일러 메이저 버전업. TS 6의 엄격한 side-effect import 검사(TS2882)에 대응해 `src/types/assets.d.ts`를 추가하여 `*.css` 임포트 선언 제공. 타입체크·테스트 전부 통과, `@typescript-eslint/*`와도 peer 호환(`<6.1.0`). `dependabot.yml` typescript ignore 블록 제거. ([#251](https://github.com/idean3885/trip-planner/issues/251))
- **Vitest 3 → 4 업그레이드**: 테스트 러너와 `@vitest/coverage-v8` 메이저 버전 동반 업그레이드. 기존 테스트 152개 전부 통과, 기능 회귀 없음. `dependabot.yml` vitest ignore 블록 제거. ([#252](https://github.com/idean3885/trip-planner/issues/252))


## [2.4.1] - 2026-04-19

### Chore

- **towncrier 도입으로 CHANGELOG 충돌 해소**: PR마다 `changes/<이슈>.<타입>.md` 단편 파일 1개를 추가하고, 릴리즈 PR에서 `towncrier build`로 자동 집계해 `CHANGELOG.md`에 합친다. 단일 파일 동시 편집 충돌이 구조적으로 차단되어 워크트리 분기 + AI 보조 병렬 작업이 안전해진다. 기존 `auto-tag.yml` / `auto-release.yml` / `pypi-publish.yml` 자동화 체인은 그대로 유지. ([#272](https://github.com/idean3885/trip-planner/issues/272))


## [2.4.0] - 2026-04-19

### Added
- **프로젝트 아이덴티티 표면 구축**: 앱을 공유받은 방문자가 프로젝트 출처·API 접근 경로를 즉시 파악할 수 있도록 3종 표면 추가. (#200)
  - **전역 풋터** — 모든 페이지 하단에 `Made by idean3885`, `GitHub ↗`, `About`, `API Docs ↗` 노출. flex-wrap 단일 레이아웃(브레이크포인트 분기 없음), sticky footer(짧은 콘텐츠 페이지에서도 뷰포트 하단 고정).
  - **About 페이지** — `/about` 공개 라우트 신설. 프로젝트 배경·저작자·라이선스·기술 스택 요약 표시. 로그인 없이 접근 가능.
  - **설정 페이지 API 문서 진입점** — 설정 페이지 제목 옆에 "API 문서 →" 링크 추가.
  - **단일 메타 소스** — `src/lib/project-meta.ts`에 `ProjectMeta` 타입과 `projectMeta` 상수를 `as const satisfies`로 정의. 풋터·About 모두 동일 소스 참조로 drift 구조적 방지.
  - **공개 라우트 확장** — 미들웨어에 `/about`과 `/docs`를 공개 경로로 추가. 비로그인 방문자도 프로젝트 정체성·API 문서에 도달 가능.
  - 신규 npm 의존성 0건(아이콘은 유니코드 `↗` 인라인).

## [2.3.4] - 2026-04-19

### Fixed
- **speckit `create-new-feature.sh` 워크트리 분기 충돌**: 호출자(devex:flow 등)가 `NNN-*` 브랜치를 선행 생성한 상태에서 `/speckit.specify` 호출 시 스크립트가 `git checkout -b`를 다시 시도하며 충돌. 현재 브랜치가 `NNN-<suffix>` 패턴이고 `specs/<branch>/`가 아직 없으면 해당 브랜치를 재사용하도록 감지 블록 추가. 동시에 `git branch -a` 파싱 시 워크트리 체크아웃 마커(`+`)를 sed 필터에 반영하여 타 워크트리에서 체크아웃된 브랜치가 자동 채번에서 누락되던 부수 버그도 수정.

## [2.3.3] - 2026-04-19

### Changed
- **dependabot 플로우 정규화**: `target-branch: develop` 추가(npm, pip, github-actions). dependabot PR이 기본값으로 `main`을 타겟하면서 Git Flow Lite(feature/hotfix → develop PR) 정책을 우회하던 문제 해소. (#258)

### Chore (deps)
- **GitHub Actions**: `actions/checkout` 4 → 6, `astral-sh/setup-uv` 업데이트. (#245)
- **npm**: `postcss` 8.5.9 → 8.5.10, `eslint-config-next` 업데이트. (#246)

## [2.3.2] - 2026-04-19

### Fixed
- **Hotfix: Day 상세 페이지 500 (DYNAMIC_SERVER_USAGE)**: v2.3.1의 `trips/` 디렉토리 제거(#239)로 `generateStaticParams`가 빈 배열을 반환하면서, `auth()`를 호출하는 동일 페이지가 Next.js의 SSG 플래그와 충돌해 런타임 500이 발생. `src/app/trips/[id]/page.tsx`, `src/app/trips/[id]/day/[dayId]/page.tsx`, `src/app/day/[num]/page.tsx`에서 `generateStaticParams` 제거 + `export const dynamic = "force-dynamic"` 명시로 세션 기반 동적 렌더 고정. 레거시 `/day/[num]`는 홈으로 리다이렉트.

## [2.3.1] - 2026-04-18

### Fixed
- **Activity 시각 저장 IANA timezone 무시**: `toTimestamp`가 `setUTCHours`로 HH:mm을 UTC 가정하여 기록하고 프론트는 `getUTCHours()`로 표시해 "floating-time" 관행이 되어 있었다. `src/lib/activity-time.ts` 공통 유틸로 HH:mm + dayDate + IANA timezone → 실제 UTC 변환(DST 경계 보정 포함), 표시는 `Intl.DateTimeFormat({ timeZone })` 기반으로 수정. 기존 데이터는 `data-migration` SQL로 `AT TIME ZONE` 연산 재계산. (#232)
- **여행 상세 일정 목록 정렬**: Day 목록이 `sortOrder` 기준으로 정렬되어 늦게 추가된 Day(예: 귀국일 `sortOrder=0`)가 최상단에 노출. 정렬 키를 `date ASC`로 변경. DAY 라벨(번호)은 표시용으로만 유지. (#238)

### Removed
- **레거시 마크다운 트립 데이터 및 관련 스크립트·템플릿**: v2.0.0 AX 방향 이후 DB가 단일 정본이 되어 `trips/*.md` 마크다운은 drift 원인이 된 이중장부. 구 일정 마크다운 vs 신 일정 DB 불일치 확인. `trips/2026-honeymoon-portugal-spain/`, `templates/`, `scripts/` 레거시 5개(`generate-pdf.sh`, `parse-daily-to-events.py`, `validate-daily.py`, `validate-budget.py`, `migrate-markdown.ts`) 제거. CLAUDE.md는 DB 정본 기반으로 재작성. (#239)

## [2.3.0] - 2026-04-17

### Added
- **speckit 하네스 도입**: 이슈 #181 + 12개 하위 이슈(#205~#216). 스펙 산출물 간 정합성 자동 검증으로 #191 유형(plan 항목 tasks 미매핑 → 데이터 마이그레이션 누락)의 재발을 구조적으로 차단.
  - 4종 메타태그(`[artifact]`, `[why]`, `[multi-step]`, `[migration-type]`)를 검증 근간으로 고정
  - 검증기 7종 + CI 워크플로우 2종 추가: `validate-metatag-format.sh`, `validate-plan-tasks-cov.sh`, `validate-drift.sh`, `validate-quickstart-ev.sh`, `validate-migration-meta.sh`, `validate-constitution.sh`, `merge-tasks-to-issues.sh` + `speckit-gate.yml`, `drift-audit.yml`
  - 신규 템플릿 2종(`implement-template.md`, `quickstart-template.md`) + 기존 템플릿(`spec-template.md`, `plan-template.md`, `tasks-template.md`) 메타태그 가이드 추가
  - 기존 `enforce-speckit.sh`의 `-maxdepth 1` 버그 수정(카테고리 하위 구조 탐색 정상화)
  - **3단계 롤아웃 완료**: `expand` → `migrate` → `contract`. 현재 `contract` 모드에서 speckit-gate CI가 실제 차단 역할 수행.
  - **migration-type 사이드카 방식**: `prisma/migrations/<dir>/migration-type` 파일로 레거시 마이그레이션을 Prisma checksum 손상 없이 분류 (10개 소급 적용).

### Changed
- **PR 머지 정책**: 전 방향 `Create a merge commit` 고정(#218). Squash and merge off.
- **CLAUDE.md**: "작업 규칙"에 speckit 하네스 메타태그·검증기·rollout phase 섹션 추가

## [2.2.7] - 2026-04-17

### Changed
- **URL 도출 전략 재설계**: 환경별 외부 env(AUTH_URL 등) 의존 제거. `src/lib/app-url.ts` 헬퍼 + Auth.js `trustHost: true`로 각 환경이 자기 요청 origin만 보고 동작. "dev가 prod 참조, local이 dev 참조" 교차 참조를 구조적으로 차단. 문서: `docs/ENVIRONMENTS.md`. (#194)
- **설정 페이지 PAT 발급 UX 재정비**: 자동 발급(install.sh)을 기본 시각으로 설명하고 수동 발급 폼은 `<details>` 접힘 "수동 발급 (고급)" 영역으로 이동. 설치 가이드·API 문서 링크 추가. 웹 전용 유저도 self-serve 가능하게 유지. `POST /api/tokens` deprecated 표기 해제(공식 경로로 유지). (#199, 디스커션 #187 후속)

### Added
- **여행 멤버 목록 UI**: 여행 상세 페이지에 동행자 섹션 추가 — 아바타/이름/역할 배지(주인·호스트·게스트). OWNER → HOST → GUEST 순 정렬 후 joined_at 오름차순. (#193, 디스커션 #186)

### Fixed
- **여행 삭제/양도 전면 불가 상태 복구**: `POST /api/trips`가 생성자를 `HOST`로 기록해 OWNER가 존재하지 않던 문제 수정. 생성자는 이제 OWNER로 등록되며, 기존 여행은 마이그레이션으로 `tripMember.userId == trip.createdBy` 조건에서 OWNER로 승격됨. 홈 목록의 "호스트" 표시도 정상적으로 "내 여행"으로 복구됨. (#191, 디스커션 #188)
- **여행 삭제 UI 노출**: 여행 상세 페이지에 OWNER 전용 "여행 삭제" 버튼 추가. 확인 다이얼로그 포함. (#191)
- **여행 나가기 UI 노출**: HOST/GUEST 대상 "여행 나가기" 버튼 추가 — 초대 → 합류 → 나가기 플로우 완결. OWNER는 양도 후 탈퇴 필요 (API가 차단). (#191)
- **초대 링크 상대경로 생성**: dev 환경에서 invite URL이 `/invite/...` 상대경로로 생성되어 외부 앱 붙여넣기 시 `file://`로 해석되던 문제 수정. 위 URL 도출 재설계로 재발 불가. (#194, 디스커션 #185 Case 1 실제 원인)

## [2.2.6] - 2026-04-17

### Fixed
- **초대 링크 비로그인 플로우**: 비로그인 유저가 `/invite/{token}` 접근 시 middleware가 `callbackUrl`을 보존하지 않아 로그인 후 홈으로 이탈하던 문제 수정. 이제 로그인 완료 후 원래 초대 링크로 복귀하여 TripMember가 정상 생성됨. (#189, 디스커션 #185)

## [2.2.5] - 2026-04-17

### Fixed
- **Activity 시간 필드**: VarChar → Timestamptz 전환, 프로덕션 DB 정합성 수습 (#178)
- **auto-release**: CHANGELOG 특수문자 셸 확장 오류 수정 (--notes-file 방식)

### Added
- **IANA timezone 컬럼**: start_timezone, end_timezone으로 시간대 표시 지원 (#178)
- **docs/ARCHITECTURE.md**: 시스템 구조, 인증 흐름, 도메인 결합도 문서
- **docs/DOMAIN.md**: DDD 기술 도메인, 애그리거트, 이벤트 설계
- **docs/ERD.md**: 전체 DB 스키마 Mermaid ERD + 컬럼 코멘트
- **docs/README.md**: 기술 문서 허브 (포트폴리오/개발자용)
- **specs/README.md**: 기획 도메인 5개 정의 + 크로스 도메인 규칙
- **헌법 v1.2.0**: Cross-Domain Integrity(V) + Role-Based Access Control(VI) 원칙 추가

### Changed
- **specs/ 재구성**: 기획 도메인 기준 디렉토리 (travel-search, itinerary, collaboration, export)
- **기획/기술 영역 분리**: specs/ = 기획 원천, docs/ = 기술 원천, 헌법 = 원칙 원천

## [2.2.4] - 2026-04-16

### Fixed
- **MCP memo 줄바꿈**: CLI에서 `\n` 리터럴이 그대로 저장되던 문제 수정 (#169)
- **예약상태 라벨**: "불필요" → "예약 불필요"로 문구 보완 (#169)

### Changed
- **시간대 표기 지원**: Activity startTime/endTime VarChar(5→12) 확장, `13:00 KST` 형식 가능 (#169)
- **vitest SWC 전환**: `@vitejs/plugin-react` → `@vitejs/plugin-react-swc` (transform 12% 개선) (#170)
- **vitest vmThreads**: `pool: "vmThreads"` 적용으로 environment 18% 개선 (#170)

## [2.2.3] - 2026-04-16

### Fixed
- **PR 머지 전략**: develop → main은 merge commit 필수 (squash 시 역머지 충돌 문제 해결)

### Changed
- **CLAUDE.md + DEVELOPMENT.md**: PR 머지 전략 테이블 추가 (squash vs merge commit 사용 구분)

## [2.2.2] - 2026-04-16

### Fixed
- **핫픽스 프로세스**: main 직접 머지 금지, develop 경유 필수로 규칙 정립
- **speckit 하네스**: develop 브랜치 소스 편집 차단 추가 (enforce-speckit.sh, enforce-submit.sh)

### Changed
- **CLAUDE.md**: 핫픽스 규칙 + 브랜치 다이어그램에 hotfix 반영
- **docs/DEVELOPMENT.md**: 핫픽스 프로세스 섹션 추가

## [2.2.1] - 2026-04-16

### Fixed
- **PyPI 배포 실패**: rapidapi 테스트에서 삭제된 `get_client` 함수를 참조하던 테스트 수정

## [2.2.0] - 2026-04-16

### Added
- **OAuth CLI 인증**: install.sh에서 브라우저 Google 로그인 1회로 PAT 자동 발급·저장 (#128)
- **MCP 런타임 재인증**: 토큰 만료(401) 시 브라우저 자동 재인증 + 요청 재시도 (#129)
- **PAT 미설정 초기 인증**: MCP 첫 호출 시 토큰 없어도 브라우저 인증으로 자동 발급
- **auto-release.yml**: 태그 push 시 CHANGELOG 기반 GitHub Release 자동 생성
- **Git Flow Lite 전략**: main(production) + develop(dev) + feature 브랜치 전략 도입 (#148)
- **dev.trip.idean.me**: develop 브랜치 전용 알파 배포 도메인

### Changed
- **auto-tag.yml**: lightweight → annotated 태그 전환
- **install.sh**: 수동 PAT 입력 → 브라우저 OAuth 우선 (수동은 폴백)
- **token-helpers.ts**: createPAT 공유 헬퍼 추출, /api/tokens 리팩터
- **web_client.py**: asyncio.Lock 기반 동시 재인증 방지, 키체인 자동 갱신

## [2.1.0] - 2026-04-16

### Added
- **Activity 데이터 모델**: ActivityCategory/ReservationStatus enum + Activity 테이블 (#124)
- **Activity CRUD API**: GET/POST/PATCH/PUT/DELETE 엔드포인트 5개 (#127)
- **MCP 도구 확장**: create/update/delete/reorder_activity, get_day_content, clear_day_content — 14→20개 (#127, #134)
- **ActivityCard 컴포넌트**: 카테고리/시간/장소/비용/예약상태 카드 뷰 (#127)
- **ActivityForm 컴포넌트**: 구조화 입력 폼, 현지 시각 자동 세팅, 필수 필드 표시 (#125)
- **ActivityList 컴포넌트**: CRUD + 순서 변경(▲▼) 클라이언트 상태 관리 (#125)
- **memo URL 자동 링크**: 메모 내 URL을 클릭 가능한 링크로 렌더링 (새 창) (#125)
- **마크다운 변환 지원**: get_day_content + clear_day_content MCP 도구, 변환 안내 배너 (#134)
- **테스트 인프라**: Vitest + React Testing Library + Playwright E2E — 61케이스 (#141)
- **alpha 환경**: alpha.trip.idean.me 프리뷰 도메인 구성 (#127)
- **OpenAPI v2.1.0**: Activity 스키마 + 5개 엔드포인트 문서화 (#127)
- **GET /days/{dayId} API**: 단일 일자 상세 조회 (활동 포함) (#134)

### Changed
- **일자 상세 페이지**: DayEditor 제거 → ActivityList + 읽기 전용 메모 (#125)
- **get_trip MCP**: 일자별 활동 수 표시 (#127)

### Fixed
- **라우트 충돌**: `[id]`/`[slug]` 동적 라우트 통합 — dev 서버 크래시 해소 (#127)
- **인증 리다이렉트**: 로그인 상태에서 /auth/signin 접근 시 홈으로 (#127)
- **AUTH_URL Preview 스코프**: 프리뷰 배포 인증 정상화 (#127)

## [2.0.1] - 2026-04-14

### Fixed
- PAT 인증 수정 + UI 개선

## [2.0.0] - 2026-04-14

### Added
- Next.js 15 웹앱 (App Router, SSR)
- Auth.js v5 Google OAuth + PAT 인증
- Neon Postgres + Prisma 7
- MCP 14개 도구 (검색 8 + CRUD 6)
- OpenAPI 3.0 + Scalar 문서 뷰어
- 여행/일자/멤버 CRUD API
- 초대 링크 (JWT) + 소유권 이전
- macOS 키체인 통합 설치 스크립트
