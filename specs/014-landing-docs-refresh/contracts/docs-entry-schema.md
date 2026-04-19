# Contract: `docs/README.md` 엔트리 & 문서 헤더 스키마

**Branch**: `014-landing-docs-refresh`

`docs/` 진입점 문서(`docs/README.md`)와 각 개별 문서의 상단 메타에 대한 구조 계약.

## `docs/README.md` 엔트리 구조

```text
1. 한 줄 소개
   - "이 디렉터리는 프로젝트의 심화 문서를 담습니다."
   - "외부 방문자는 루트 [README.md](../README.md)와 [랜딩](https://trip.idean.me)을 먼저 보세요."

2. 독자 그룹 3층(정확히 이 순서)
   - ## 기여자·개발자 — 코드·아키텍처·도메인을 이해하려는 분
     - ARCHITECTURE.md / DEVELOPMENT.md / DOMAIN.md / ERD.md / design-handoff.md
   - ## 운영·감사 — 배포·감사·증적을 확인하려는 분
     - ENVIRONMENTS.md / audits/ / evidence/ / research/
   - ## 공통 — 양쪽 모두 참조
     - WORKFLOW.md

3. 각 엔트리 행의 형식
   - `- [{title}]({path}) — {누가 · 왜 읽는지 1줄}`
```

## 개별 문서 상단 헤더 규약

**위치**: 파일 첫 제목(H1) 바로 아래.

**형식**:
```markdown
> **대상 독자**: {라벨} — {보조 설명 1줄}
```

**라벨 매핑** (data-model.md 2.3과 동일):

| 파일 | 라벨 |
|------|------|
| ARCHITECTURE.md | 기여자·개발자 |
| DEVELOPMENT.md | 기여자·개발자 |
| DOMAIN.md | 기여자·개발자 |
| ERD.md | 기여자·개발자 |
| design-handoff.md | 디자이너·개발자 협업 |
| ENVIRONMENTS.md | 운영·감사 |
| WORKFLOW.md | 기여자·개발자·운영자 공통 |
| audits/*.md | 운영·감사(감사 기록) |
| evidence/*.md | 운영·감사(수동 증적) |
| research/*.md | 리서치(조사 스냅샷) |

## 검증 계약

### 자동(스크립트)

`scripts/check-docs-reader-header.sh` (신설):
- 대상: `docs/**/*.md` (단 `docs/README.md`는 제외).
- 실패 조건: 첫 H1 바로 아래 4줄 안에 `> **대상 독자**:` 패턴이 없는 경우.
- CI 통합은 본 피처 범위 밖(quickstart Evidence로 수동 실행).

### 수동

- `docs/README.md`의 3층 구조가 실존 여부와 1:1 매칭되는지 확인.
- 각 엔트리 행의 경로 링크가 실제 파일로 해석되는지(상대 경로 점검).

## 변경 후 링크 무결성

- `docs/spec.md` 이관(→ `docs/audits/2026-04-v1-spec-snapshot.md`) 수반 시 저장소 전체에서 구 경로 참조를 갱신한다.
- 검증: `grep -r "docs/spec.md" .` 결과가 이관 이후 0건(과거 커밋 메시지는 예외 — git log는 손대지 않음).
