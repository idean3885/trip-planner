# Contract: README.md 재구성 스키마

**Branch**: `014-landing-docs-refresh`

루트 `README.md`의 최종 형태에 대한 구조 계약. 작성 시 이 순서·규칙을 따른다.

## 섹션 구조 (순서 고정)

```text
1. 히어로
   - `# {projectMeta.name}` 1회
   - tagline 1문장 (projectMeta.tagline 재사용)
   - 웹앱 대표 링크 1개 (trip.idean.me) — **이 위치에서 1회만 노출**
   - 배지 (선택): build status · version · license

2. 프로젝트 정체성 3줄
   - "이 프로젝트는 무엇을 하는 서비스인가?" 1~3 문장
   - 포트폴리오 어필 포인트 (AI 에이전트 · MCP · 실사용 도메인) 간결 언급

3. 독자별 진입점 (3층)
   - ### 써보고 싶은 분 (외부 방문자)
     - 랜딩/웹앱 링크 + 주요 기능 한 줄
   - ### 코드를 보고 싶은 분 (기여자·개발자)
     - `docs/README.md`로 이동 + ARCHITECTURE.md·DEVELOPMENT.md 직접 링크
   - ### 운영·감사 관점 (릴리즈·감사)
     - CHANGELOG.md · docs/WORKFLOW.md · docs/ENVIRONMENTS.md 직접 링크

4. 빠른 시작 (요약)
   - 웹앱: 로그인 한 줄
   - MCP 에이전트: `scripts/install.sh` 1줄
   - 상세는 `docs/DEVELOPMENT.md`로 위임

5. 링크 표 (단일 위치)
   - 웹앱 | trip.idean.me        ← **trip.idean.me 2회차 등장 허용**
   - API 문서 | trip.idean.me/docs
   - 개발 문서 | docs/README.md   (엔트리 경유로 이동)
   - 변경 이력 | CHANGELOG.md
   - 보안 | SECURITY.md
```

## 불변식 (검증 기준)

| 규칙 | 검증 방법 |
|------|-----------|
| `trip.idean.me` 링크 노출 ≤ 2회(히어로 + 링크 표) | `grep -c "trip.idean.me" README.md` → 2 이하 |
| 독자 3층 헤더 모두 존재(`써보고 싶은 분` 외 2개) | 정규식 grep |
| `docs/README.md` 링크 존재 | grep |
| `CHANGELOG.md` 링크 존재 | grep |
| projectMeta와 README hero가 동일 문구 | 수동 확인(Evidence에 기록) |

## 기존 섹션 이동·삭제

| 현 README 섹션 | 처리 |
|----------------|------|
| "이렇게 쓰세요 > 1. 웹에서 일정 관리" | 4번 "빠른 시작"에 **요약만 유지**, 세부 가이드는 `docs/`로 이관 |
| "이렇게 쓰세요 > 2. AI 에이전트로 검색" | 동일(요약만) |
| "AI가 할 수 있는 것 (20개 도구)" 표 | 랜딩의 FeatureHighlights 섹션으로 이동(또는 포인터). README엔 요약 1줄만 |

목적: README는 **진입점**, 깊은 설명은 `docs/` 또는 랜딩이 담당.

## 금지 사항

- `trip.idean.me` 3회 이상 노출 금지.
- 동일 문서로 가는 링크 3회 이상 반복 금지(단, 목차 성격은 예외).
- "개인 여행 일정 예시" 같은 1인 콘텐츠 노출 금지.
