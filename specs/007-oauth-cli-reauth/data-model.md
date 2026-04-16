# Data Model: OAuth CLI 인증 + MCP 런타임 재인증

## 기존 엔티티 (변경 없음)

### PersonalAccessToken

기존 PAT 모델을 그대로 재사용한다. CLI/MCP 자동 발급 토큰도 동일 테이블에 저장.

| Field | Type | Description |
|-------|------|-------------|
| id | Int (PK) | 자동 증가 |
| userId | String (FK → User) | 토큰 소유자 |
| name | String | 토큰 이름 — CLI 자동 발급 시 "CLI (자동 로그인)" |
| tokenHash | String (unique) | SHA256 해시 |
| tokenPrefix | String | "tp_" + 8자 (표시용) |
| expiresAt | DateTime? | 만료 시각 — CLI 자동 발급 시 null (무기한) |
| lastUsedAt | DateTime? | 마지막 사용 시각 |
| createdAt | DateTime | 생성 시각 |

### User, Account, Session

변경 없음. 기존 Auth.js 모델 유지.

## 새로운 엔티티

없음. 인증 콜백 세션은 URL 파라미터(port, state)로만 관리되며 DB에 저장하지 않음.

## 상태 전이

### CLI 인증 플로우

```
[시작] → 키체인 확인 → PAT 있음 → [완료: 스킵]
                     → PAT 없음 → localhost 서버 기동
                                → 브라우저 열기
                                → Google 로그인
                                → PAT 자동 발급
                                → localhost 콜백 수신
                                → 키체인 저장 → [완료: 성공]
                     → 타임아웃/실패 → 수동 입력 폴백 → [완료: 수동]
```

### MCP 재인증 플로우

```
[API 호출] → 200 → [완료: 성공]
           → 401 → Lock 획득
                  → 이미 갱신됨? → 재시도 → [완료]
                  → 브라우저 재인증 → 성공 → 키체인 갱신 → 클라이언트 재생성 → 재시도 → [완료]
                                   → 실패 → 에러 반환 → [완료: 실패]
```
