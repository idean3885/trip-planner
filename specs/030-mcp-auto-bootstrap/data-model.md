# Data Model — Spec 030 (MCP 자동 부트스트랩)

Phase 1 산출. 본 spec은 신규 DB 모델 도입을 최소화합니다.

## 변경 대상

### `Token` (기존)

변경 없음. OAuth 콜백에서 자동 발급 시 같은 `Token` 모델·같은 `/api/tokens` 엔드포인트 재사용.

```prisma
model Token {
  id          Int       @id @default(autoincrement())
  userId      String
  name        String
  tokenHash   String    @unique
  tokenPrefix String
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

OAuth 자동 발급 시 `name`은 디바이스 hostname + 부트스트랩 세션 마커(예: `"MacBook-Pro (auto 2026-05-28)"`).

### 신규 모델 (선택)

본 spec에서는 신규 DB 모델을 도입하지 않습니다. 부트스트랩 세션 로그·진단 정보는 협력자 로컬 파일(`~/.config/trip-planner/bootstrap.log`)에만 남깁니다. DB 모델은 후속 spec에서 필요 시 검토.

## 외부 응답 추가 헤더

trip-planner API의 모든 v2 응답에 다음 헤더 추가:

| 헤더 | 값 | 용도 |
|------|------|------|
| `X-Trip-Planner-Min-MCP-Version` | 예: `3.0.0` | 현재 API와 호환되는 최소 MCP 버전. MCP client가 자기 버전과 비교해 update trigger |

`Min-MCP-Version`보다 낮은 MCP가 호출하면 API는 200 응답 + 헤더로 안내. 또는 MAJOR breaking 시 4xx 응답 + body에 안내. (`contracts/mcp-version-handshake.md` 참조)

## 로컬 파일

```text
~/.config/trip-planner/
├── credentials               # PAT 저장 (mode 0600, Linux fallback). macOS는 Keychain
├── bootstrap.log             # install/update/재인증 세션 로그
└── consent.json              # 사용자 동의 기록 (이슈 등록·diagnostics 전송 동의)
```

macOS Keychain entry:

* Service: `trip-planner`
* Account: 사용자 trip-planner email (or user id)
* Password: PAT 평문

## 도메인 경계 (Constitution V)

| 데이터 | 원천 도메인 | 본 spec 변경 |
|--------|-----------|-----------|
| `Token` | 인증 (사용자 도메인) | 추가 발급 흐름 — 같은 모델 재사용. 도메인 경계 변경 없음 |
| MCP 버전 정보 | MCP 패키징 | PyPI JSON 응답 조회. 단방향 |
| GitHub 이슈 | 외부 (GitHub) | 사용자 본인 토큰으로만 등록. trip-planner 본 도메인에서는 작성 시도 안 함 |

## 무결성·검증 규칙

* OAuth 콜백은 1회만 listener가 수령. 재시도 시 새 listener·새 포트.
* PAT 발급 후 즉시 keychain·파일 저장. 메모리 평문 유지 시간 최소화.
* `X-Trip-Planner-Min-MCP-Version` 헤더 미존재 시 client는 기본값(현재 release 시점 MCP 버전 = 호환)으로 동작.
