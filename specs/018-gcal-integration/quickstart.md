# Quickstart — Google Calendar 연동

본 피처의 동작을 확인하는 자동·수동 증거(Evidence) 절차. `/speckit.implement` 완료 후 이 문서의 체크리스트를 따라 재현 가능성을 검증한다.

## 사전 조건

- Google 계정 로그인으로 trip.idean.me (또는 dev)에 접속 가능
- 활동 2개 이상 포함된 여행 1개
- 본인 구글 캘린더에 "기본 캘린더" 접근 가능

## 예상 사용자 플로우

1. 여행 상세 페이지 진입 → "구글 캘린더에 올리기" 버튼 확인(스크롤 없이 보여야 함, #150)
2. 버튼 클릭 → 캘린더 선택 모달("이 여행 전용 캘린더 자동 생성" 기본)
3. 확인 → 캘린더 권한 동의 화면으로 리디렉트(최초 1회)
4. 동의 완료 → 여행 상세로 자동 복귀 → 상태가 "연결됨 · 반영 시각"으로 변경
5. 본인 구글 캘린더 앱/웹 열기 → 새 캘린더 `<여행명> (trip-planner)` 안에 활동이 이벤트로 존재
6. 여행에서 활동 하나 수정 → 상세 페이지의 "다시 반영하기" 클릭 → 이벤트가 갱신되고 **중복 생성되지 않음**
7. 구글 캘린더 웹에서 이벤트 1개를 직접 수정(예: 제목 접미 추가) → "다시 반영하기" → 상태에 "건너뜀 1개" 배지
8. 상세 페이지에서 "연결 해제" → 전용 캘린더의 trip-planner 생성 이벤트가 삭제됨(사용자 수정분은 보호되어 남음)

## Evidence

### 자동 (Vitest)

- `tests/api/gcal-link.test.ts`
  - [ ] scope 없는 사용자 POST /link → 409 + `authorizationUrl` 반환
  - [ ] scope 있는 사용자 POST /link(DEDICATED) → 전용 캘린더 생성 호출 + 이벤트 N개 생성 + 200 `status=ok`
  - [ ] 다른 멤버의 `GCalLink`는 본 세션으로 조회되지 않음(본인 경계 강제, R5)
- `tests/api/gcal-sync.test.ts`
  - [ ] PATCH /sync — 새 활동 추가 시 이벤트 생성, 기존 활동 수정 시 PATCH(If-Match), 삭제 활동은 DELETE
  - [ ] PATCH 412 응답 → `skipped++`, 매핑 유지(사용자 수정 보호)
  - [ ] DELETE 412 응답 → `skipped++`, 매핑 끊기
  - [ ] 401 → refresh_token으로 재발급 후 1회 재시도
  - [ ] 429 → 지수 백오프 최대 3회
- `tests/api/gcal-status.test.ts`
  - [ ] 연결 안 된 여행 → `{ linked: false, scopeGranted: ... }`
  - [ ] 연결된 여행 → `{ linked: true, link: {...} }` (타 멤버 시선에서는 `linked: false`로 보여야 함)
- `tests/lib/gcal/format.test.ts`
  - [ ] 이벤트 제목이 `[여행명] 카테고리기호 활동제목` 형식
  - [ ] 설명란에 예약 상태·지도 링크·트립 URL이 포함
  - [ ] `startTimezone`/`endTimezone` 그대로 Google event의 `start.timeZone`에 매핑(#232·#325 기반)
- `tests/lib/gcal/sync.test.ts`
  - [ ] diff 알고리즘: 추가/변경/삭제를 정확히 분류
  - [ ] ETag 기반 건너뛰기 로직
- `tests/lib/gcal/client.test.ts`
  - [ ] 오류 매핑(401/403/404/412/429/5xx) 정확성
  - [ ] refresh_token 재발급 1회 재시도
- `tests/lib/gcal/auth.test.ts`
  - [ ] authorization URL 빌더: `include_granted_scopes=true`, `prompt=consent`, `scope` 파라미터 포함
- `tests/components/GCalLinkPanel.test.tsx`
  - [ ] 비연결 상태 → "구글 캘린더에 올리기" 버튼 표시
  - [ ] 연결 상태 → 캘린더명·마지막 반영 시각 표시
  - [ ] `skippedCount > 0` → "건너뜀 N개" 배지 표시
  - [ ] `lastError = REVOKED` → "다시 연결하기" CTA 표시
- `tests/components/GCalCalendarChoice.test.tsx`
  - [ ] 기본값 DEDICATED 선택
  - [ ] PRIMARY로 전환 가능

### 수동 (Browser)

**검증 환경: `https://dev.trip.idean.me`** (develop 머지 후).

PR Preview URL은 Google OAuth `redirect_uri`에 등록되지 않아 동의 단계에서 `redirect_uri_mismatch`로 실패한다(`docs/ENVIRONMENTS.md` Layer 2 참조). Preview에선 UI 렌더링·버튼 배치·비권한 라우팅까지만 확인 가능하며, 실제 Google OAuth·캘린더 생성·이벤트 CRUD는 dev 환경에서만 재현된다.

각 단계 완료 시 체크.

- [ ] (Step 1) 여행 상세에서 "구글 캘린더에 올리기" 버튼이 스크롤 없이 보인다
- [ ] (Step 3) 권한 동의 화면에 **캘린더 이벤트 RW 권한만** 요청된다(읽기 권한 더 요청하지 않음)
- [ ] (Step 4) 동의 완료 후 여행 상세로 복귀하며, 로그인 상태가 유지된다(재로그인 요청 없음)
- [ ] (Step 5) 본인 구글 캘린더 웹(calendar.google.com) "내 캘린더" 목록에 `<여행명> (trip-planner)` 캘린더가 있다
- [ ] (Step 5) 이벤트 시각이 현지 타임존(예: Lisbon은 WEST/WET)으로 정확히 표시된다
- [ ] (Step 6) 활동 수정 후 "다시 반영하기" → 월간 뷰에서 이벤트가 갱신되며 중복 생성 없음
- [ ] (Step 7) 구글 캘린더에서 수동 수정 후 "다시 반영하기" → 수정 내용 보존 + 상세 페이지에 "건너뜀 1개" 표시
- [ ] (Step 8) "연결 해제" 후 전용 캘린더 자체는 남아있고, 안의 trip-planner 생성 이벤트만 사라진다(사용자 수정분은 유지)
- [ ] (회귀) iCal 경로(`che-ical-mcp`)를 기존 방식대로 실행 → iCloud '여행' 캘린더에 이벤트가 이전과 동일하게 생성된다(FR-011)

### 공유 여행 검증 (추가 수동)

2계정(A·B)으로 같은 여행을 공유한 상태에서.

- [ ] A만 "올리기" 실행 후 B의 구글 캘린더 확인 → B의 캘린더에 **아무 이벤트도 없음** (FR-007)
- [ ] B의 여행 상세 상태 조회 → "내 캘린더에 연동 안 됨"으로 표시(A의 연동 상태 노출 금지)
- [ ] A의 "다시 반영하기" 반복 실행 → B 캘린더 변화 없음

## 관찰성 힌트

- 서버 로그에 `[gcal] user=<id> trip=<id> action=<LINK|SYNC|UNLINK> status=<ok|partial|failed> summary=...` 형식으로 1줄 로그.
- GCal REST 호출 실패는 HTTP status + Google errors[].reason을 함께 남긴다.
- 민감 정보(access_token·refresh_token) 로그 금지.
