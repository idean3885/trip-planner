# Contract — MCP 버전 handshake

## startup verify

MCP 서버(`trip_mcp/bootstrap.py`)가 spawn 직후 1회 실행:

```text
1. 자기 패키지 버전 확인 (pkg_resources / importlib.metadata)
2. PyPI JSON API 호출:
     GET https://pypi.org/pypi/trip-planner-mcp/json
     timeout 5s
3. response.info.version 비교
4. 자기 버전 < latest:
     stderr에 안내:
       trip-planner-mcp 새 버전(<latest>)이 있습니다.
       Claude에 "trip-planner MCP 업데이트해줘" 라고 요청해주세요.
5. PyPI 호출 실패: 무시 (network·rate limit 등)
```

## 도구 호출 응답 헤더

trip-planner API의 모든 v2 응답에 헤더 포함:

```http
HTTP/1.1 200 OK
X-Trip-Planner-Min-MCP-Version: 3.0.0
X-Trip-Planner-Server-Version: 3.0.0
Content-Type: application/json
```

* `X-Trip-Planner-Min-MCP-Version`: 현재 API와 호환되는 MCP 최소 버전
* `X-Trip-Planner-Server-Version`: 현재 server 버전 (참조용)

## MCP client(자기) 버전 < Min-MCP-Version 처리

```text
1. MCP 서버가 도구 호출 후 응답 헤더 확인
2. Min-MCP-Version > 자기 버전:
     도구 응답을 그대로 반환하되 응답에 메타 추가:
       {
         ...정상 응답...,
         _meta: {
           upgrade_required: true,
           server_version: "3.0.0",
           min_mcp_version: "3.0.0",
           current_mcp_version: "2.16.10",
           upgrade_hint: "trip-planner-mcp 업데이트가 필요합니다."
         }
       }
3. AI client는 _meta.upgrade_required true를 보고 사용자에게 자연어 안내
```

## MAJOR breaking 응답 (v3.0.0 같은 케이스)

API가 호환 안 되는 호출(예: 폐기된 파라미터)을 받으면:

```http
HTTP/1.1 400 Bad Request
X-Trip-Planner-Min-MCP-Version: 3.0.0

{
  "error": "deprecated_parameter",
  "message": "create_trip의 startDate/endDate 파라미터는 v3.0.0부터 제거됐습니다. trip-planner MCP를 업데이트해주세요.",
  "deprecated": ["startDate", "endDate"],
  "guidance": "create_day 또는 create_activity로 derived 기간이 부여됩니다."
}
```

AI client가 응답을 받아 자연어로 사용자에게 안내 + 자동 업데이트 흐름 trigger.

## 종료 코드

* MCP 서버 startup verify는 stderr 안내 외 종료 코드 영향 없음 (0 유지 — 정상 동작)
* 도구 호출 응답이 4xx여도 MCP 서버 자체는 살아 있음. AI client가 자연어 처리

## 헤더 미존재 케이스

* server가 헤더 안 보내면 (구버전 API) client는 default `MIN-VERSION ≤ 자기` 가정 → 정상 동작
* PyPI 호출 실패 시 update verify 안 함 → 정상 동작 (degraded)
