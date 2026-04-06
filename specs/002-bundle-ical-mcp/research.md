# Research: che-ical-mcp 번들 설치

## 조사 배경

install.sh에 che-ical-mcp를 번들하려면, 해당 패키지의 배포 방식과 설치 경로를 파악해야 한다.

## 핵심 발견

### che-ical-mcp는 npm 패키지가 아니다

- **실제 배포**: GitHub Releases에서 macOS 네이티브 바이너리(`CheICalMCP`)로 배포
- **소스**: https://github.com/kiki830621/che-ical-mcp (릴리즈는 PsychQuant org 하위)
- **최신 버전**: v1.7.0
- **바이너리**: Mach-O universal binary (x86_64 + arm64), 약 28MB
- **Node.js 의존 없음**: npx가 아닌 단독 실행 바이너리

### 현재 설치 상태

| 환경 | 등록 여부 | 경로 |
|------|-----------|------|
| Claude Code (user scope) | ✅ 등록됨 | `/Users/nhn/bin/CheICalMCP` |
| Claude Desktop | ❌ 미등록 | - |

### 설치 방식

1. GitHub Releases에서 `CheICalMCP` 바이너리 다운로드
2. `~/bin/` 또는 `~/.trip-planner/bin/` 등에 배치
3. `chmod +x` 부여
4. Claude Desktop config에 등록: `{"command": "/path/to/CheICalMCP"}`

## 결정사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 배포 방식 | GitHub Releases 바이너리 다운로드 | npm 패키지 아님. 네이티브 바이너리 |
| 설치 경로 | `~/.trip-planner/bin/CheICalMCP` | trip-planner 설치 디렉토리에 통합 관리 |
| Node.js 의존 | 없음 | spec의 FR-002, FR-003 수정 필요 (Node.js 체크 불필요) |
| macOS 체크 | `uname -s` == Darwin | Apple 캘린더 전용이므로 macOS 아니면 스킵 |
| 버전 고정 | latest 릴리즈 사용 | GitHub API로 최신 버전 감지 |

## Spec 수정 필요 사항

- FR-002: ~~Node.js/npm 존재 여부 확인~~ → macOS 여부 확인으로 변경
- FR-003: ~~Node.js 없는 경우~~ → macOS 아닌 경우 스킵으로 변경
- Edge Case: ~~Linux에서 npm 없음~~ → Linux/non-macOS에서 자동 스킵
