# Data Model: 글래스모피즘 표면 디자인 (크롬+컨테이너)

**Feature**: `065-glassmorphism-surfaces`

## 스키마 변경

**없음.** 본 피처는 UI 표면 처리 전용이다. Prisma 스키마·마이그레이션·영속 데이터 변경이 없다.

## 정적 자산(디자인 토큰)

DB 엔티티가 아닌 CSS 토큰만 신설한다. 정본은 `src/app/globals.css`의 `:root`.

| 토큰 | 용도 | 성격 |
|------|------|------|
| `--glass-bg` | 캔버스 위 표면(카드·헤더·푸터) 반투명 배경 | rgba |
| `--glass-overlay` | 임의 콘텐츠 위 오버레이(다이얼로그·드롭다운·셀렉트) 반투명 배경(더 불투명) | rgba |
| `--glass-border` | 유리 표면 상단 하이라이트 테두리 | rgba |
| `--glass-blur` | `backdrop-filter` 블러 반경 | length |
| `--glass-bg-fallback` | 블러 미지원 시 표면 폴백 배경(불투명도 상향) | rgba |
| `--glass-overlay-fallback` | 블러 미지원 시 오버레이 폴백 배경 | rgba |
