# 잔여 위반 목록 (spec 038)

자동정비(`eslint --fix`·`prettier --write`)로 해소되지 않은 위반의 분류·처리 기록. spec FR-007 / US3.

## 처리 요약

| 규칙 | 건수 | 처리 | 사유 |
|------|------|------|------|
| simple-import-sort/imports·exports | 192 | 자동수정 | `eslint --fix`로 일괄 해소 |
| @typescript-eslint/no-unused-vars (`_` 접두) | 9 | ignore 패턴 | `^_`는 의도적 미사용 표시 — typescript-eslint 표준 컨벤션으로 허용 |
| @typescript-eslint/no-unused-vars (실제 미사용) | 2 | 제거 | `router`(ActivityList), `waitFor`(GCalLinkPanel.test) 삭제 |
| react-hooks/set-state-in-effect | 6 | **warn 강등** | 후속 검토 대상 |

## warn 강등 — 후속 검토 (react-hooks/set-state-in-effect)

effect 내 동기 setState. 자동수정 불가이고 잘못 고치면 렌더 동작이 바뀔 수 있어 error로 즉시 차단하지 않고 warn으로 둔다. 후속 feature에서 개별 검토 후 정리한다.

- `src/components/ActivityForm.tsx:105`
- `src/components/GCalLinkPanel.tsx:146`
- `src/components/calendar-import/DraftListPanel.tsx:135`
- `src/components/calendar-sync/sections/DraftSection.tsx:155`
- `src/components/calendar-sync/sections/ImportSection.tsx:84`
- `src/components/calendar/AppleEntryCard.tsx:83`

## 색상 가드

- 기존 src에서 토큰 외 색상 리터럴(hex/rgb/`-[#...]`) 위반 **0건** — 이미 토큰을 잘 사용 중. 기존 위반 파일 예외 처리 불필요.

## lint 대상 제외 (탐색 잔재)

- `web/` — git 비추적 옛 탐색 디렉토리(node_modules·.next 포함). ignore 처리. 별도 삭제는 후속 판단.
