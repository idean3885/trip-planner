# Quickstart: che-ical-mcp 번들 설치 검증

## 시나리오 1: 신규 설치 (macOS)

```bash
# 기존 설치 제거
rm -rf ~/.trip-planner

# 설치
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash

# 검증
# 1. Claude Desktop 설정에 travel + che-ical-mcp 모두 등록되었는지 확인
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool

# 2. CheICalMCP 바이너리 존재 확인
ls -la ~/.trip-planner/bin/CheICalMCP

# 3. Claude Desktop 재시작 후 캘린더 목록 조회
```

## 시나리오 2: 업데이트 설치 (travel만 있는 기존 환경)

```bash
# 재설치 (업데이트)
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash

# 검증: travel 유지 + che-ical-mcp 추가 확인
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
```

## 시나리오 3: che-ical-mcp 이미 독립 설치된 환경

```bash
# 기존 che-ical-mcp가 /Users/xxx/bin/CheICalMCP에 있는 상태에서 설치
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash

# 검증: 기존 che-ical-mcp 설정이 덮어써지지 않았는지 확인
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
```
