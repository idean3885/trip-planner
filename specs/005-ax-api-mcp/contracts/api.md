# API Contracts: PAT 엔드포인트

## 인증 방식

모든 API는 두 가지 인증을 지원한다:
1. **세션 인증**: 웹 브라우저 쿠키 (기존)
2. **토큰 인증**: `Authorization: Bearer <token>` 헤더 (신규)

토큰 인증 시 해당 토큰 소유자의 userId로 요청이 처리된다.

## New Endpoints

### POST /api/tokens — 토큰 생성

**Auth**: 세션 인증 필수 (토큰으로 토큰 생성 불가)

**Request**:
```json
{
  "name": "My MacBook",
  "expiresAt": "2027-01-01T00:00:00Z"  // optional, null = 무기한
}
```

**Response 201**:
```json
{
  "id": 1,
  "name": "My MacBook",
  "token": "tp_a1b2c3d4e5f6g7h8i9j0...",  // 원문, 이 응답에서만 노출
  "tokenPrefix": "tp_a1b2c3d4",
  "expiresAt": "2027-01-01T00:00:00Z",
  "createdAt": "2026-04-15T12:00:00Z"
}
```

**Errors**: 401 (미인증), 400 (name 누락/빈값)

### GET /api/tokens — 토큰 목록

**Auth**: 세션 인증 필수

**Response 200**:
```json
[
  {
    "id": 1,
    "name": "My MacBook",
    "tokenPrefix": "tp_a1b2c3d4",
    "expiresAt": "2027-01-01T00:00:00Z",
    "lastUsedAt": "2026-04-15T14:30:00Z",
    "createdAt": "2026-04-15T12:00:00Z"
  }
]
```

### DELETE /api/tokens/[id] — 토큰 삭제 (무효화)

**Auth**: 세션 인증 필수, 본인 토큰만 삭제 가능

**Response 200**:
```json
{ "ok": true }
```

**Errors**: 401 (미인증), 403 (타인 토큰), 404 (존재하지 않음)

## Modified Endpoints

### 기존 모든 API (/api/trips/**, /api/trips/[id]/days/** 등)

**변경 사항**: `Authorization: Bearer <token>` 헤더로도 인증 가능

**동작**:
1. Authorization 헤더가 있으면 토큰 인증 시도
2. 토큰이 유효하면 해당 userId로 요청 처리
3. 토큰이 없으면 기존 세션 인증으로 폴백
4. 둘 다 없으면 401

**토큰 인증 시 부가 동작**:
- `lastUsedAt` 자동 갱신
- 만료된 토큰은 401 반환
