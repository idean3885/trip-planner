# Drift Audit Reports

speckit 하네스의 **tasks ↔ artifact 일치성 감사** 리포트 보관 디렉토리.
근거: spec `010-speckit-harness` US2, FR-003/004, PR #204.

## 생성 주체

- **정기 감사 (audit)**: `.github/workflows/drift-audit.yml`이 `cron "0 0 * * 1"` (UTC = KST 월 09:00)로 `validate-drift.sh --audit` 실행 후 리포트를 이 디렉토리에 커밋한다. (#208)
- **PR 게이트 (PR-specific)**: `.github/workflows/speckit-gate.yml`이 PR 변경 피처만 감사한다. 리포트는 PR 코멘트로 노출되고 디렉토리에 보관하지 않는다. (#208)
- **수동 실행**: `validate-drift.sh --audit` 직접 호출 시에도 동일 경로에 저장된다.

## 파일명 규약

- 정기 감사: `YYYY-MM-DD.md` (실행 날짜 KST 기준)
- 마이그레이션 스냅샷: `YYYY-MM-<label>.md` (Phase B 소급 작업 등 일회성 기록)

## 등급

| 등급 | 기준 | 처리 |
|------|------|------|
| error | tasks.md에서 체크됐으나 선언한 `[artifact: ...]`가 레포에 없음 | PR 게이트 실패, 정기 감사 리포트에 `Errors` 섹션 |
| warning | tasks.md에서 미체크인데 선언한 `[artifact: ...]`가 이미 존재 (drift) | 차단은 아님, `Warnings` 섹션 |

## 보관 정책

- 정기 감사 리포트는 커밋 이력에 남기며 별도 삭제하지 않는다.
- 1년 경과 시 필요하면 `docs/audits/drift/archive/` 하위로 이관한다(수동).
- 리포트 내용이 모두 "위반 0건"이어도 파일을 삭제하지 않는다(주기 실행 흔적 유지).

## 설정

주기·경로·등급은 `.specify/config/harness.json`의 `driftAudit`에서 오버라이드 가능하다(spec FR-015).

```json
"driftAudit": {
  "cron": "0 0 * * 1",
  "reportDir": "docs/audits/drift",
  "severity": {
    "checkedMissingArtifact": "error",
    "uncheckedHasArtifact": "warning"
  }
}
```
