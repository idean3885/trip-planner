# Data Model: v2.0.0 AX + API MCP

## New Entity: PersonalAccessToken

외부 클라이언트(MCP 서버)가 API에 인증하기 위한 토큰.

### Fields

| Field | Type | Constraints | Description |
| ----- | ---- | ----------- | ----------- |
| id | Integer | PK, autoincrement | 고유 식별자 |
| userId | String | FK → User.id, onDelete: Cascade | 토큰 소유자 |
| name | String | required | 토큰 이름 (사용자 식별용, e.g. "My MacBook") |
| tokenHash | String | unique | SHA-256 해시 (원문 저장 안함) |
| tokenPrefix | String | 8자 | 목록 표시용 prefix (e.g. "tp_a1b2c3d4") |
| expiresAt | DateTime? | nullable | 만료일 (null = 무기한) |
| lastUsedAt | DateTime? | nullable | 마지막 사용 시각 |
| createdAt | DateTime | default: now() | 생성 시각 |

### Relationships

- `User` 1:N `PersonalAccessToken`: 사용자별 여러 토큰 생성 가능
- Cascade delete: 사용자 삭제 시 모든 토큰 삭제

### Indexes

- `tokenHash` unique index: 토큰 조회 성능
- `userId` index: 사용자별 토큰 목록 조회

### State Transitions

```
Created → Active (사용 중, lastUsedAt 갱신)
Active → Expired (expiresAt 경과)
Active → Revoked (사용자가 삭제)
Created → Revoked (사용 전 삭제)
```

### Validation Rules

- `name`: 1~100자, 빈 문자열 불가
- `tokenHash`: 64자 고정 (SHA-256 hex digest)
- `tokenPrefix`: "tp_" + 8자 랜덤 hex = 11자
- `expiresAt`: null 또는 현재 시각 이후

## Existing Models (변경 없음)

기존 User, Trip, Day, TripMember 모델은 변경하지 않는다.
User 모델에 `personalAccessTokens` 관계만 추가.
