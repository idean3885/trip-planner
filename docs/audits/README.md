# Audits

speckit 하네스·스펙 정합성·릴리즈 drift 등을 점검한 감사 리포트를 모은다. 자동 생성 리포트와 수동 감사 기록이 섞여 있다.

## 하위 색인

| 경로 | 내용 |
|------|------|
| [drift/](drift/README.md) | `validate-drift.sh` 기반 주간 drift 감사. tasks ↔ 실제 아티팩트 일치 여부 추적. |

## 생성 규칙

- 자동 감사는 `.github/workflows/drift-audit.yml` 주간 실행 결과가 `drift/` 하위에 날짜 파일로 누적된다.
- 수동 감사(마이그레이션 스냅샷 등)는 파일명에 맥락을 명시한다(예: `2026-04-migration.md`).
- 감사 결과의 조치 여부·후속 이슈는 각 리포트 본문에 기록한다.
