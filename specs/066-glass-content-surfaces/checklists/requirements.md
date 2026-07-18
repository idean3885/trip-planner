# Requirements Quality Checklist: 글래스모피즘 확장 (콘텐츠 + 테두리)

**Feature**: `066-glass-content-surfaces`

- [x] FR이 검증 가능한 결과로 표현됐는가 (글래스 클래스 부착·테두리 대비)
- [x] 성능 위험(스크롤 다수 카드 블러)에 보정 경로가 있는가 (`--glass-blur` 하향, FR/plan)
- [x] 접근성(WCAG AA)이 성공 기준에 있는가 (SC-003)
- [x] 색 정본(하드코딩 금지, 기존 토큰 재사용)이 명시됐는가 (FR-003·SC-004)
- [x] 톤·이미지 불변이 명시됐는가 (FR-006)
- [x] 각 US가 독립 테스트 가능한가 (US1 콘텐츠 / US2 테두리)
- [x] 스키마 변경 없음이 명시됐는가 (data-model.md)
