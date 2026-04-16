# Quickstart: OAuth CLI 인증

## 개발 환경 설정

```bash
# 1. 의존성 설치
npm install          # Next.js
pip install -e ".[dev]"  # MCP 서버 (테스트 포함)

# 2. 환경변수
cp .env.example .env.local
# DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 설정

# 3. 개발 서버
npm run dev          # http://localhost:3000
```

## 테스트

```bash
# TypeScript 테스트
npx vitest run

# Python 테스트
pytest tests/

# 타입 체크
npx tsc --noEmit
```

## 수동 테스트 시나리오

### install.sh 브라우저 인증
1. 키체인에서 기존 PAT 삭제: `security delete-generic-password -s trip-planner -a api-pat`
2. `bash scripts/install.sh` 실행
3. 브라우저가 열리면 Google 로그인
4. 터미널에 "인증 완료" 메시지 확인
5. 키체인에 토큰 저장 확인: `security find-generic-password -s trip-planner -a api-pat -w`

### MCP 재인증
1. 키체인의 PAT를 만료된 토큰으로 교체
2. Claude Desktop에서 MCP 도구 호출 (예: "내 여행 목록 보여줘")
3. 브라우저가 열리면 Google 로그인
4. 원래 요청이 자동으로 재시도되어 결과 표시 확인
