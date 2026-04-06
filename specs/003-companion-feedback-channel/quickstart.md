# Quickstart: 동행자 피드백 채널

## 시나리오 1: 신규 설치 (GitHub PAT 입력)

```bash
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash
```

1. 기존 설치 단계 진행 (Python, venv, RapidAPI, 캘린더)
2. "GitHub 토큰을 입력하세요" 프롬프트 → fine-grained PAT 입력
3. Claude Desktop 재시작
4. Claude Desktop에서: "둘째 날 저녁 식당 추가하고 싶어"
5. → AI가 초안 작성 → GitHub Discussion에 게시됨
6. → 개발자가 Discussion 확인 후 반영

## 시나리오 2: 신규 설치 (GitHub PAT 건너뛰기)

1. 설치 스크립트 실행
2. GitHub 토큰 입력에서 Enter (건너뛰기)
3. travel + calendar MCP만 등록됨
4. 피드백 기능은 미사용 — 나중에 설치 스크립트 재실행으로 추가 가능

## 시나리오 3: 기존 사용자 업데이트

1. 이미 travel + calendar이 설치된 상태
2. 설치 스크립트 재실행
3. GitHub PAT가 키체인에 없으면 → 입력 프롬프트
4. 기존 travel/calendar 설정 유지 + feedback 서버 추가

## 검증 체크리스트

- [ ] 설치 후 `~/.trip-planner/src/feedback_mcp/` 존재
- [ ] 키체인에 `trip-planner` / `github-pat` 항목 존재
- [ ] Claude Desktop 설정에 `feedback` 서버 등록
- [ ] Claude Desktop에서 피드백 도구 목록 확인 가능
- [ ] 디스커션 생성 → GitHub에서 확인
