# Data Model: 글래스모피즘 확장 (콘텐츠 + 테두리)

**Feature**: `066-glass-content-surfaces`

## 스키마 변경

**없음.** UI 표면 처리 전용. Prisma 스키마·마이그레이션·영속 데이터 변경 없음.

## 정적 자산

신규 토큰 없음 — spec 065의 `:root` 글래스 토큰(`--glass-bg`/`--glass-blur` 등)과 `.glass-surface` 유틸을 재사용한다. 카드 테두리 대비만 `ring-foreground/10` → `ring-foreground/15`로 상향한다.
