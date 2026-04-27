# Apple iCloud CalDAV POC (issue #345)

이슈 [#345](https://github.com/idean3885/trip-planner/issues/345) 검증 매트릭스 10항목을 실측하기 위한 spike. **제품 코드 반영 금지, reference only**.

## 사전 준비 (사용자)

### 1. 2단계 인증 활성화

Apple ID(`appleid.apple.com`)에서 **2단계 인증**을 활성화한다. 이미 켜져 있으면 skip.

### 2. App-Specific Password 발급

1. https://appleid.apple.com → 로그인
2. "로그인 및 보안" → "앱 암호" → "암호 생성"
3. 라벨: `trip-planner-poc` (자유)
4. 표시되는 16자리 암호(예: `abcd-efgh-ijkl-mnop`)를 즉시 복사 — 다시 못 본다.

### 3. 환경변수 입력

```bash
cd spike/apple-caldav
cp .env.example .env.local
# .env.local 편집:
#   APPLE_ID=your-apple-id@example.com
#   APPLE_APP_PASSWORD=abcd-efgh-ijkl-mnop
```

`.env.local`은 `.gitignore`에 포함되어 push되지 않는다.

### 4. 의존성 설치

```bash
cd spike/apple-caldav
npm install
```

## 측정 (자동)

```bash
cd spike/apple-caldav
npm run matrix
```

콘솔에 #1~#10 결과가 순서대로 출력되고, `results/<run-label>.json`에 raw 데이터가 저장된다.

### 자동 측정 가능 항목

| # | 항목 | 자동 |
|---|---|---|
| 1 | PROPFIND 인증 응답 시간 | ✅ |
| 2 | 기존 캘린더 목록 | ✅ |
| 3 | MKCALENDAR 시도 | ✅ |
| 5 | VEVENT PUT 생성 | ✅ |
| 6 | VEVENT PUT update + ETag | ✅ |
| 7 | VEVENT DELETE | ✅ |
| 8 | 잘못된 app-password → 401 | ✅ |
| 9 | 2FA 미설정 → app-password 발급 불가 | ⚠️ Apple 정책상 자동 검증 불가 — 문구만 정의 |
| 10 | app-password 만료/재발급 | ⚠️ 장기 측정 — 공식 문서 인용 |

### 수동 측정 (#4 — Apple 캘린더 앱 수동 생성 → iCloud 반영 지연)

1. macOS 캘린더 앱 또는 iOS 캘린더 앱에서 새 캘린더 생성 (예: `apple-app-test`)
2. 즉시 `npm run matrix` 다시 실행 → #2 결과에 새 캘린더가 보이면 반영 완료
3. 안 보이면 30초 대기 후 재실행. 보일 때까지 시간 기록.
4. 측정값을 `docs/research/apple-caldav-poc.md` #4 행에 기재.

## Cleanup

스크립트가 #3에서 생성한 POC 캘린더는 종료 시 자동 DELETE 시도. 실패하면 Apple Calendar에서 수동 삭제 (이름: `trip-planner-poc-<timestamp>`).

테스트 종료 후 사용한 app-password는 https://appleid.apple.com → "앱 암호"에서 폐기 권장.

## 30초 스크린캐스트 (사용자)

위자드 UX(2FA 안내 → app-password 안내 → 입력 → PROPFIND 검증) 흐름을 30초 내로 녹화. macOS Cmd+Shift+5 → 화면 영역 선택 → 녹화. 파일은 `results/wizard-<run-label>.mov` 또는 외부 링크.

## 결과 → 정본 문서로

`results/<run-label>.json`을 받아 `docs/research/apple-caldav-poc.md` #1~#10 표를 채우고 v0 Mermaid를 실측 기반으로 교정한다.
