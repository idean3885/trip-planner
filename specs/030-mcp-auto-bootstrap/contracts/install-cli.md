# Contract — install CLI

## 1줄 진입점

```bash
curl -fsSL https://trip.idean.me/install | sh
```

또는 (AI client 자연어 요청 시 AI가 자동 실행):

```bash
curl -fsSL https://trip.idean.me/install | sh -s -- --auto
```

## 환경 변수

| 변수 | 용도 | 기본 |
|------|------|------|
| `TRIP_PLANNER_INSTALL_DIR` | MCP 서버 설치 경로 | `~/.local/share/trip-planner` |
| `TRIP_PLANNER_NO_REGISTER` | MCP client 등록 스킵 (수동 등록 케이스) | unset |
| `TRIP_PLANNER_AUTO` | 사용자 입력 없이 자동 진행 (AI client용) | unset |
| `TRIP_PLANNER_API_HOST` | API 호스트 override (개발용) | `https://trip.idean.me` |

## 표준 종료 코드 (FR-015)

| 코드 | 의미 | AI client 처리 |
|------|------|------|
| 0 | 성공 | "설치 완료" 안내 |
| 1 | 일반 실패 (네트워크·다운로드·파일 시스템 등) | 진단 메시지 + 1회 재시도 |
| 2 | 인증 필요 (사용자 브라우저 인증 누락·실패) | "브라우저에서 인증 마쳐주세요" |
| 3 | 의존성 부족 (Python·uv·Node 미설치 등) | "다음 도구를 설치해주세요" |
| 4 | OS 미지원 (Windows 등) | "지원되지 않는 환경" 안내 |
| 5 | 권한 부족 (keychain·파일 쓰기) | 권한 문제 안내 |

## stdout / stderr 출력 형식 (FR-014)

* **stdout**: 사용자 친화 메시지 — "다운로드 중...", "인증 대기 중...", "설치 완료". 한국어
* **stderr**: 진단 로그 — 명령 출력·에러 trace. 사용자가 일반적으로 안 봄

**평문 비노출 룰**:

* PAT·비밀번호는 어느 stream에도 출력 안 함
* 진단 로그에서도 PAT은 prefix 8자만 + `...` 마스킹
* 이메일은 도메인 부분만 노출(`xxx@gmail.com` → `***@gmail.com`)

## 흐름

```text
$ curl ... | sh
[1/5] 의존성 확인...
[2/5] trip-planner-mcp 다운로드...
[3/5] 인증 — 브라우저가 열립니다. 로그인 후 동의해주세요.
       (로컬에서 https://trip.idean.me/oauth/authorize?... 자동 열림)
       (사용자 브라우저 1회 동의)
       (자동 PAT 발급 + 키체인 저장)
[4/5] Claude Code에 등록 (claude mcp add -s user trip-planner ...)
[5/5] 동작 검증 — trip-planner MCP가 list_trips 호출에 응답합니다.
✓ 설치 완료. Claude에 "trip-planner로 여행 목록 보여줘" 같이 요청해보세요.
```

## 실패 시 흐름

```text
$ curl ... | sh
[3/5] 인증 실패 (사용자가 브라우저 닫음)
  1회 자동 재시도...
[3/5] 인증 실패 (재시도 후에도 실패)
  진단:
    - listener: localhost:54321 (timeout 60초)
    - 마지막 콜백 응답 없음
  다음 행동:
    1. 브라우저에서 https://trip.idean.me 로그인 상태 확인
    2. 다시 시도: curl -fsSL https://trip.idean.me/install | sh
    3. 도움 받기: 이슈를 자동 등록할까요? (y/n)
$
```
