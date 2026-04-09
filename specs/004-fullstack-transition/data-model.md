# Data Model: 풀스택 전환

**Date**: 2026-04-09
**Feature**: [spec.md](spec.md)

## Entities

### User

서비스 사용자. 소셜 로그인으로 자동 생성.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | PK, auto-generated | |
| name | string | nullable | 소셜 계정에서 가져옴 |
| email | string | unique, nullable | 소셜 계정에서 가져옴 |
| emailVerified | datetime | nullable | Auth.js 표준 |
| image | string | nullable | 프로필 이미지 URL |
| createdAt | datetime | default now | |

**Relationships**: owns Trip (1:N), has Member (1:N), created Invitation (1:N)

### Trip

여행 단위. 소유자가 생성하고 팀원과 공유.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | PK, auto-generated | |
| title | string | required | |
| description | text | nullable | 여행 개요 (텍스트) |
| startDate | datetime | nullable | |
| endDate | datetime | nullable | |
| createdAt | datetime | default now | |
| updatedAt | datetime | auto-updated | |
| ownerId | string | FK → User.id, cascade delete | 생성자 고정, 이전 불가 |

**Relationships**: has Day (1:N), has Member (1:N), has Invitation (1:N)

### Day

일별 일정. 하루 단위 텍스트 블록.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | PK, auto-generated | |
| tripId | string | FK → Trip.id, cascade delete | |
| date | datetime | required | 일정 날짜 |
| title | string | nullable | 도시명 등 간략 제목 |
| content | text | nullable | 하루 단위 일정 텍스트 (기존 마크다운 그대로) |
| sortOrder | integer | default 0 | 정렬 순서 |

**Index**: (tripId, date)

### Member

여행과 사용자의 관계. 권한 포함.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | PK, auto-generated | |
| tripId | string | FK → Trip.id, cascade delete | |
| userId | string | FK → User.id, cascade delete | |
| role | enum | OWNER / EDITOR / VIEWER, default VIEWER | |
| joinedAt | datetime | default now | |

**Unique constraint**: (tripId, userId)

### Invitation

팀 초대. 토큰 기반, 7일 만료.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | PK, auto-generated | |
| tripId | string | FK → Trip.id, cascade delete | |
| invitedById | string | FK → User.id | 초대자 |
| email | string | required | 초대 대상 이메일 |
| token | string | unique, auto-generated | 256비트 불투명 토큰 |
| role | enum | OWNER / EDITOR / VIEWER, default VIEWER | 합류 시 부여할 권한 |
| status | enum | PENDING / ACCEPTED / DECLINED / EXPIRED, default PENDING | |
| expiresAt | datetime | required | 생성 시점 + 7일 |
| createdAt | datetime | default now | |

**Index**: (token), (email, status)

### Auth.js 표준 모델

Auth.js PrismaAdapter가 요구하는 모델. 직접 조작하지 않음.

- **Account**: 소셜 프로바이더 연동 정보 (provider, providerAccountId, tokens)
- **Session**: DB 세션 (JWT 전략 사용 시에도 어댑터가 생성, 실제로는 미사용)
- **VerificationToken**: 이메일 인증 토큰 (현재 미사용, Auth.js 표준)

## 권한 모델

| 역할 | 여행 조회 | 일정 조회 | 일정 편집 | 일정 추가/삭제 | 개요 편집 | 팀원 초대 | 팀원 제거 | 권한 변경 | 여행 삭제 |
|------|----------|----------|----------|-------------|----------|----------|----------|----------|----------|
| OWNER | O | O | O | O | O | O | O | O | O |
| EDITOR | O | O | O | O | O | X | X | X | X |
| VIEWER | O | O | X | X | X | X | X | X | X |

## 상태 전이

### Invitation

```
PENDING → ACCEPTED (사용자가 초대 수락)
PENDING → EXPIRED (7일 경과 또는 새 초대로 대체)
PENDING → DECLINED (사용자가 초대 거절, 현재 UI 미구현)
```

## Entity Relationship Diagram (텍스트)

```text
User 1──N Trip (owner)
User 1──N Member
User 1──N Invitation (invitedBy)

Trip 1──N Day
Trip 1──N Member
Trip 1──N Invitation

Member = Trip ←→ User (N:M join table with role)
```
