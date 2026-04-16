# Contract: CLI Auth API

## GET /api/auth/cli

CLI/MCP 클라이언트가 브라우저 OAuth를 통해 PAT를 발급받는 엔드포인트.

### Request

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| port | integer | Yes | 1024 ≤ port ≤ 65535 |
| state | string | Yes | length ≥ 16 |

### Responses

**400 Bad Request** — 파라미터 검증 실패
```json
{ "error": "Invalid port: must be 1024-65535" }
{ "error": "Invalid state: must be at least 16 characters" }
```

**302 Redirect (미로그인)** — Google 로그인 페이지로 이동
```
Location: /auth/signin?callbackUrl=%2Fapi%2Fauth%2Fcli%3Fport%3D{port}%26state%3D{state}
```

**302 Redirect (로그인됨)** — localhost 콜백으로 토큰 전달
```
Location: http://127.0.0.1:{port}/callback?token={rawToken}&state={state}
```

### Localhost Callback (수신 측)

install.sh 또는 web_client.py가 기동하는 localhost HTTP 서버.

**GET /callback**

| Param | Type | Description |
|-------|------|-------------|
| token | string | 발급된 PAT (tp_ 접두사 + 64 hex) |
| state | string | 요청 시 전송한 CSRF state |

수신 측은 state를 검증한 후 token을 키체인에 저장.
