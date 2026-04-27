# Apple iCloud CalDAV POC — 측정 결과 + 확정 플로우

**상태**: 자동 측정 완료 (#1~3, #5~8). 수동 측정 #4 + 30초 스크린캐스트 대기.
**이슈**: [#345](https://github.com/idean3885/trip-planner/issues/345)
**spike**: `spike/apple-caldav-poc` 브랜치 (제품 코드 반영 금지, reference only)
**작성**: 2026-04-27

## 목적

Apple iCloud CalDAV를 trip-planner의 두 번째 캘린더 provider로 도입하기 전, **제약 사항이 많은 연동 플로우를 실제 사용감으로 확정**한다. 본 문서가 후속 정식 피처 스펙(`calendar-provider-abstraction`, `apple-caldav-provider`)의 기준이 된다.

## 배경

- Google Calendar는 OAuth 심사 제약(Testing 100명 cap, sensitive/restricted CASA 연 $500~$4.5k)으로 확장성 한계 — [ADR-0004](../adr/0004-gcal-testing-mode-cost.md) 참조
- Apple은 CalDAV용 OAuth 미제공 → **app-specific password + Basic Auth**만 가능
- 수동 단계(2FA, app-password 생성)는 **Apple 정책상 원천적으로 불가피** → 자동화의 경계가 결정 포인트
- 방향: Google 연동은 Testing 유지, Apple CalDAV를 추가해 무심사·무제한 경로 확보

## 측정 환경

| 항목 | 값 |
|---|---|
| Endpoint | `https://caldav.icloud.com` |
| 라이브러리 | [`tsdav` 2.1.8](https://github.com/natelindev/tsdav) |
| 인증 | Basic (Apple ID + 16자리 app-specific password) |
| 측정자 | 본인(개발자) |
| 측정일 | 2026-04-27 (run-1, run-2) |
| Apple ID | 마스킹 (raw JSON은 `.gitignore`로 git 제외) |
| 캘린더 환경 | 6개 (VEVENT 5 + VTODO 1, 공유 3개 포함, 모두 한국어 이름) |

## 검증 매트릭스 결과

> 자동 측정은 `spike/apple-caldav/matrix.ts` 실행 결과(`results/<run-label>.json`)에서 가져온다. #4·#9·#10는 수동/문서 보강.

| # | 항목 | 기대 | 실측 (run-2) | 판정 |
|---|---|---|---|---|
| 1 | PROPFIND 인증 검증 응답 시간 | <2s | login 1.2~1.6s (run-1: 1586ms, run-2: 1231ms) | ✅ 위자드 검증 단계 UX 허용 범위 |
| 2 | 기존 캘린더 목록 조회 (한국어 이름·공유 포함) | 전체 정확 반환 | 6개 (한국어 이름 6, 공유 3) — VEVENT 5 + VTODO 1 정상 분리 | ✅ |
| 3 | **MKCALENDAR 신규 생성** | 불확실 (iCloud 미지원 가능성 높음) | **201 Created** (516ms) — 생성 성공, 사용자별 calendar-home 하위에 즉시 생성 | ✅ **핵심 발견** — iCloud는 MKCALENDAR를 실제로 지원. v0 Mermaid의 fallback 분기 제거 가능 |
| 4 | Apple 캘린더 앱 수동 생성 → iCloud 반영 지연 | ? | _(pending — 수동 측정)_ | 폴링 주기 결정 보류 |
| 5 | VEVENT PUT (생성) | 201/204 + 즉시 반영 | 201 Created, ETag 즉시 반환 (예: `"mogw96h9"`), 527ms | ✅ |
| 6 | VEVENT PUT (update, If-Match ETag) | 204 | 204 No Content, 482ms | ✅ |
| 7 | VEVENT DELETE | 204 | 412 Precondition Failed (옛 ETag 사용 시) → 새 ETag 받으면 204 | ✅ ETag strict — 클라이언트가 항상 최신 ETag 추적해야 함 |
| 8 | 잘못된 app-password | 401 즉시 | 401 Unauthorized, 311ms | ✅ |
| 9 | 2FA 미설정 Apple ID | app-password 발급 자체 불가 | Apple 정책 — 발급 화면 노출 안 됨 | UX: 사전 안내 문구로 차단 |
| 10 | app-password 만료/재발급 주기 | ? | Apple 공식: 자연 만료 없음. Apple ID 비밀번호 변경 시만 일괄 무효화 | 재인증 트리거: 401 발생 시 |

## 의사결정

### 1. MKCALENDAR 지원 여부

- **측정 #3 결과**: 201 Created로 작동 확인 (run-1, run-2 모두). iCloud 공식 문서엔 명시되지 않은 동작이지만 실측상 안정.
- **결정**: ✅ **자동 생성을 1순위로 채택**. v0 Mermaid의 `Fallback` 분기(MKCALENDAR 실패 시 "기존 선택" / "수동 생성")는 안전망으로 보수 유지하되 일반 사용자에겐 노출하지 않음(자동 생성 실패 시에만 노출).

### 2. 캘린더 선택 UX

- **결정**: ✅ **C. 둘 다 제공, 자동 생성을 기본**. UX:
  - 기본 액션: "trip-planner 전용 캘린더 자동 생성" (MKCALENDAR로 생성, 한 번만)
  - 보조 옵션: "기존 캘린더에 추가" — 고급 옵션으로 접어둠. 캘린더 목록(#2)에서 VEVENT 컴포넌트를 가진 것만 노출.
- 사용자 캘린더 환경 실측: VEVENT 5 + VTODO 1 → VTODO만 있는 캘린더(미리 알림)는 자동 필터링 필요.

### 3. 수동 생성 후 반영 대기 UX

- 측정 #4(수동 측정) 후 확정. 임시 결정:
  - MKCALENDAR가 작동하므로 "Apple 앱에서 수동 생성" 경로는 **권장 흐름에서 제외**. 자동 생성 실패 시에만 노출.
  - 폴링이 필요한 시나리오는 거의 없을 것으로 예상되나, 수동 측정 #4 결과가 "수십 초 지연"이면 **30초 polling + 수동 새로고침 fallback** 패턴 적용.

### 4. 인증 정보 암호화 방식

- **결정**: ✅ **B. 단일 대칭키 (envelope encryption은 후속 도입 옵션)**
- **근거**:
  - Vercel/Neon 무료 티어 환경에 별도 KMS 인프라 도입은 1인 운영 비용 대비 과대.
  - 단일 대칭키(`APPLE_PASSWORD_ENCRYPTION_KEY`)를 Vercel env에 두고 Node `crypto`(AES-256-GCM)로 password 컬럼 암호화. IV는 row마다 생성·저장.
  - **트레이드오프**: 키 회전 시 전체 재암호화 필요. 1인 운영 + 수십 명 규모에선 수동 회전 가능. 사용자 1000명 이상 규모 도달 시 envelope 도입 검토.
  - 메모리 [feedback_library_first_principle] / ADR-0002 정신: 라이브러리 우선 + 비용 최소.

### 5. 동기화 실패 알림 채널

- **결정**: ✅ **A 변형 — 401만 즉시 UI 배너 + 재인증 요구. 그 외 일시 오류는 무음 (다음 sync에서 자동 재시도)**
- **근거**: 측정 #8에서 401이 즉시 반환됨이 확인됨. 401은 사용자가 폐기·재발급한 경우 또는 Apple ID 비밀번호 변경(측정 #10) 후 자동 무효화된 경우. 두 케이스 모두 사용자 액션 필요 → 즉시 UI 배너로 안내.
- 이메일/푸시는 Vercel Hobby 티어 + 1인 운영 환경에서 인프라 비용 증가 → 도입 안 함. Google 연동과 동일 톤(UI 배너만) 유지.

## 추가 발견 (스펙에 반영할 비계획 사항)

### A. ETag strict 검증

DELETE에 옛 ETag를 사용하면 412 Precondition Failed (측정 #7). update가 발생한 직후엔 새 ETag를 받아 보관해야 함. **클라이언트는 항상 최신 ETag를 추적하는 ETag-table 필요**(per-event 행). 본 발견은 후속 피처 `apple-caldav-provider`의 plan.md 핵심 항목.

### B. VTODO 캘린더 자동 필터

사용자 캘린더 환경에 VTODO 전용 캘린더("미리 알림")가 섞여 있다. UI에서 VEVENT 컴포넌트가 없는 캘린더는 자동 제외 필요. 측정 #2의 raw 데이터에서 `components: ["VEVENT"]` 또는 `["VTODO"]`로 명확히 분리됨.

### C. 새 캘린더의 list 반영 지연

run-1, run-2 모두 MKCALENDAR로 생성한 캘린더가 직후 fetchCalendars에서 발견되지 않음 (matrix.ts에서 fallback 메시지 출력). 새 캘린더에 직접 PUT은 가능하지만 list 갱신엔 지연 있음. 폴링 또는 생성 직후 URL을 클라이언트가 보관하는 방식 권장.

## 확정 Mermaid (POC 후 교정판)

측정 결과를 반영해 v0의 분기 일부를 단순화·재정렬했다.

```mermaid
flowchart TD
    Start([사용자: Apple Calendar 연동 클릭]) --> W1[위자드 Step 1<br/>2FA 또는 패스키 확인 안내]
    W1 --> W1Link{{외부 링크<br/>appleid.apple.com}}
    W1Link --> W2[위자드 Step 2<br/>앱 암호 생성 안내<br/>스크린샷 7장 가이드 링크]
    W2 --> W2Link{{외부 링크<br/>appleid.apple.com → 로그인 및 보안 → 앱 암호}}
    W2Link --> W3[위자드 Step 3<br/>Apple ID + 16자리 암호 입력]
    W3 --> Validate[/서버: CalDAV PROPFIND/<br/>1.2~1.6s 실측]
    Validate -->|401 Unauthorized| W3Err[입력 오류 안내<br/>'폐기·재발급 후 다시 시도' 링크]
    W3Err --> W3
    Validate -->|200 OK| AutoCreate[/MKCALENDAR<br/>'trip-planner' 캘린더 자동 생성<br/>실측: 201 Created/]
    AutoCreate -->|201 OK| Save[(DB: CalendarConnection<br/>암호 AES-256-GCM 암호화)]
    AutoCreate -->|드물게 실패| Advanced[고급 옵션 노출<br/>VEVENT 캘린더 목록에서 선택]
    Advanced --> Save
    Save --> FirstSync[/첫 동기화: 모든 trip → VEVENT PUT/<br/>per-event ETag 보관/]
    FirstSync --> Done([완료])

    %% 운영 중 ETag 충돌
    FirstSync -.->|412 Precondition Failed<br/>외부에서 수정됨| Refetch[해당 이벤트 GET → 새 ETag<br/>재시도 또는 skip 표시]
```

**v0 대비 변경**:
- ✂️ `TryCreate -> Fallback{...} -> Wait[폴링] -> ListCal2 -> Manual` 분기 제거
  - 측정 #3에서 MKCALENDAR가 안정 작동 확인 → "Apple 앱에서 수동 생성 → 폴링" 복잡 흐름 불필요
  - "기존 캘린더 선택"은 보조 옵션으로 격하 (`Advanced`)
- ➕ `Refetch` 흐름 신설 (측정 #7 ETag strict 발견)
  - 외부에서 수정된 이벤트는 412 발생 → ETag 갱신 후 재시도 또는 skip(Google 연동과 동일 톤)
- ➕ `W3Err`에 "폐기·재발급" 링크 명시 (측정 #10 정책)
- ➕ 위자드 Step 2가 별도 캡쳐 가이드 문서를 외부 링크로 노출 (`apple-caldav-app-password-guide.md`)
- 자동 생성된 캘린더의 `list 반영 지연`은 클라이언트 측에서 생성 응답의 URL을 보관하는 방식으로 우회 (추가 발견 C)

## 30초 스크린캐스트

(예정 — `spike/apple-caldav/results/wizard-<run-label>.mov` 또는 외부 링크)

## 사용자 가이드 (앱 암호 발급)

일반 사용자 대상 단계별 캡쳐 가이드는 [`apple-caldav-app-password-guide.md`](./apple-caldav-app-password-guide.md). 후속 정식 피처(`apple-caldav-provider`)의 위자드 UI 콘텐츠 기준이 된다.

## 후속 정식 피처

POC 종료 시 두 개 이슈를 신설:

1. **calendar-provider-abstraction** — Google·Apple을 동일 인터페이스로 다루는 provider 계층. 기존 GCal 코드를 abstraction에 맞춰 리팩토링하되 무중단(expand-and-contract, [ADR-0005](../adr/0005-expand-and-contract-pattern.md))
2. **apple-caldav-provider** — 본 POC 결과를 그대로 구현. 본 문서의 확정 Mermaid가 스펙의 User Scenarios 섹션 기반.

## 변경 이력

- 2026-04-27 — 초안 작성 (이슈 #345의 v0 Mermaid 복제 + 측정 결과 빈 칸).
- 2026-04-27 — 자동 측정(run-1, run-2) 결과 채움. MKCALENDAR 작동 확인으로 Mermaid의 fallback 분기 제거. ETag strict 발견(412 처리) 추가. 의사결정 5건 답 + 추가 발견 3건 기재.
