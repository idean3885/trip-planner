# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

릴리즈 노트는 [towncrier](https://github.com/twisted/towncrier)가 `changes/` 단편 파일을 모아 자동 생성합니다. 단편 작성 가이드는 [`changes/README.md`](changes/README.md) 참조.

<!-- towncrier release notes start -->

## [3.22.0] - 2026-06-24

### Added

- * **여행 중 지출을 제목·가격·내용만으로 빠르게 기록**할 수 있습니다. 시간·장소 같은 세부는 필요할 때 "확장"으로 채우고, 예약 여부처럼 과하게 요구되던 입력은 사라졌습니다.
  * **지출을 사전 결제와 현장 결제로 구분**합니다. 여행 기간 중에는 현장 결제가 기본으로 잡혀 그 자리에서 바로 남기기 좋습니다.

  ([#807](https://github.com/idean3885/trip-planner/issues/807))


## [3.21.0] - 2026-06-23

### Added

- * **브라우저를 열 수 없는 환경에서도 한 번의 승인으로 로그인**할 수 있습니다. 안내된 주소를 기기에서 열어 본인 계정으로 승인하면 토큰이 자동으로 발급·연결되어, 토큰을 직접 복사·붙여넣지 않아도 됩니다.

  ([#793](https://github.com/idean3885/trip-planner/issues/793))


## [3.20.3] - 2026-06-22

### Fixed

- * **활동 상세 보기와 편집 화면을 명확히 구분**했습니다. 일정을 펼치면 값이 입력칸이 아닌 읽기 전용으로 보이고, "편집"을 눌러야 수정 화면으로 바뀝니다.

  ([#800](https://github.com/idean3885/trip-planner/issues/800))


## [3.20.2] - 2026-06-21

### Fixed

- * **활동 일정을 탭하면 먼저 읽기 전용 상세**가 열립니다. 보기 화면에서 곧장 편집되지 않고, 상세의 "편집"을 눌러야 수정·저장할 수 있습니다.

  ([#796](https://github.com/idean3885/trip-planner/issues/796))

### Chore

- * **레거시 API 토큰 발급 진입점**을 보안 흐름으로 통합했습니다. 자동 발급 토큰이 주소창에 노출되던 경로가 사라집니다.

  ([#794](https://github.com/idean3885/trip-planner/issues/794))


## [3.20.1] - 2026-06-21

### Fixed

- * **API 토큰 자동 발급 시 토큰 전달 방식**을 보안 강화했습니다. 자동 로그인으로 발급되는 토큰이 주소창 기록에 남지 않습니다.

  ([#789](https://github.com/idean3885/trip-planner/issues/789))


## [3.20.0] - 2026-06-05

### Added

- * **API·CLI 로그인을 한 번의 브라우저 로그인으로** 끝낼 수 있습니다. 토큰을 웹에서 수기로 발급·복사하지 않고, 단일 커맨드를 실행해 Google 로그인만 하면 토큰이 자동 저장되어 이후 호출에 쓰입니다.
  * **자동 발급 토큰에 만료(기본 30일)를 둬** 오래된 토큰을 무기한 보관하지 않습니다. 만료되면 자동으로 다시 로그인되거나 재로그인 안내를 받습니다.
  * **기존 수기 토큰 발급은 그대로** 남겨, 미리 토큰을 세팅해두고 쓰는 방식도 계속 지원합니다.

  ([#783](https://github.com/idean3885/trip-planner/issues/783))


## [3.19.0] - 2026-06-05

No significant changes.


## [3.18.0] - 2026-06-05

### Added

- * **활동에 링크(URL) 항목**을 메모와 분리해 추가했습니다. 예약·티켓·문서 링크를 메모와 섞지 않고 따로 기록하며, 입력 폼·활동 카드·API·도구에 일관되게 노출됩니다.
  * **여행 상세 일정 화면을 정돈했습니다.** 활동을 감싸던 군더더기 테두리를 없애 카드만 남기고, 활동이 없는 날에는 "등록된 활동이 없습니다" 안내를 카드로 보여줍니다. 활동 카드의 긴 메모는 세 줄까지만 보이고 전문은 활동 상세에서 확인합니다.
  * **좁은 화면(약 320px)에서 활동 추가·편집 폼**의 시작·종료 시각 입력이 겹치지 않도록 정렬을 보정했습니다.
  * **외부 캘린더 가져오기 화면**에서 Apple 캘린더와 Google 캘린더를 제목이 붙은 별도 구역으로 나눠 어느 쪽인지 한눈에 구분되게 했습니다.

  ([#776](https://github.com/idean3885/trip-planner/issues/776))

### Chore

- * **테스트 커버리지 기준을 현실적으로 조정**했습니다. 사소한 코드 한 줄까지 100% 검증하도록 강제하던 기준을 낮춰, 의미 있는 명세 테스트에 집중하고 외부 연동·화면 동작은 리뷰와 실제 기기 확인으로 검증합니다. 제품 동작에는 영향이 없습니다. ([#778](https://github.com/idean3885/trip-planner/issues/778))


## [3.17.1] - 2026-06-05

### Fixed

- * **모바일 여행 상세에서 일정이 없는 날짜**를 선택해도 화면을 아래로 스크롤하고 좌우로 스와이프해 날짜를 넘길 수 있습니다. 일정이 없는 날에는 하단 영역이 화면보다 짧아 스크롤도 스와이프도 되지 않던 문제를 바로잡았습니다. ([#772](https://github.com/idean3885/trip-planner/issues/772))


## [3.17.0] - 2026-06-05

### Added

- * 사용자가 서비스를 **어떻게 쓰는지 집계하는 분석을 도입**했습니다. 페이지 방문과 핵심 행동(여행 생성·외부 캘린더 가져오기)을 익명으로 수집해 운영 판단에 씁니다. 측정값이 설정되지 않은 환경에서는 분석이 동작하지 않고 앱은 그대로 사용됩니다.
  * 검색엔진에는 **공개 페이지(랜딩·소개·문서)만 노출**되도록 정리하고, 로그인 뒤 화면은 검색 색인에서 제외했습니다. 일정 데이터가 사용자마다 다른 서비스라 공개 색인 가치가 낮기 때문입니다.
  * 외부 캘린더 **가져오기 화면의 안내 문구를 간소화**했습니다. 내부 설명을 덜어내고 제목과 한 줄 설명만 남겨 무엇을 하는 화면인지 바로 알 수 있습니다.

  ([#767](https://github.com/idean3885/trip-planner/issues/767))


## [3.16.1] - 2026-06-05

### Documentation

- 아키텍처 설계 근거를 결정 기록(ADR)으로 남기고, 시스템 구성과 배포 구조를 한눈에 보는 대표 도식을 추가했습니다. 구조를 처음 접하는 사람이 "왜 이렇게 만들었는가"를 문서만으로 따라갈 수 있습니다. ([#746](https://github.com/idean3885/trip-planner/issues/746))


## [3.16.0] - 2026-06-05

### Removed

- * 여행 일정을 외부 캘린더로 **내보내는 기능을 제품에서 제거**했습니다. 활동을 추가·수정·삭제하거나 가져온 초안을 확정해도 외부 캘린더로 자동 반영되지 않습니다.
  * 외부 캘린더 연동은 **가져오기(읽기) 전용**으로 정리되어, 여행 일정의 정본은 trip-planner 한 곳으로 일원화됩니다. trip-planner와 외부 캘린더가 동시에 일정을 관리하면서 외부 캘린더에 잘못되거나 중복된 항목이 쌓이던 문제를 막기 위함입니다.
  * 외부 캘린더 쓰기·동기화 관련 공개 API는 더 이상 제공되지 않습니다. 과거에 외부 캘린더로 내보낸 항목이 남아 있다면 외부 캘린더에서 직접 정리하면 됩니다.

  ([#761](https://github.com/idean3885/trip-planner/issues/761))


## [3.15.1] - 2026-06-03

### Fixed

- 모바일 여행 상세에서 일정이 없거나 적을 때의 스와이프·스크롤 동작을 고쳤습니다. 빈 날에는 좌우로 넘길 영역이 없고, 일정이 짧으면 화면이 최상단으로 튀던 문제를 없애기 위함입니다.

  * 일정이 없는 날에도 좌우로 넘겨 날짜를 바꿀 수 있습니다.
  * 일정이 적어도 화면이 맨 위로 강제 이동하지 않습니다.
  * 아래로 스크롤하면 캘린더가 바로 주간으로 접히고, 맨 위로 올라오면 다시 월간으로 펼쳐집니다.

  ([#757](https://github.com/idean3885/trip-planner/issues/757))


## [3.15.0] - 2026-06-03

### Added

- 디자인의 모든 색을 시스템 단일 팔레트로 통일하고 여행 캘린더의 요일·날짜 색을 디자인대로 입혔습니다. 무채색 기본값에 머물던 화면을 디자인이 정한 색 정체성(파랑 포인트·여행 주말 초록·정확한 중립 그레이)으로 맞추기 위함입니다.

  * 요일 헤더와 날짜를 **토요일 파랑·일요일 초록·여행 주말 초록·선택 연녹 배경·오늘 테두리**로 표시합니다.
  * 본문 서체를 Inter로, 모서리 라운드와 동행 배너 색을 디자인 기준으로 정렬했습니다.
  * 색은 모두 디자인 토큰으로만 표현하며, 토큰이 빠지면 검증이 막도록 가드를 더했습니다.

  ([#752](https://github.com/idean3885/trip-planner/issues/752))


## [3.14.0] - 2026-06-03

### Added

- * **종일 일정 섹션**을 추가했습니다. 숙소처럼 시간이 없는 종일 일정을 그 날 일정 영역 맨 위 별도 섹션으로 모으고, 기본은 접어 두어 시간순 일정에 집중할 수 있습니다.
  * **활동을 종일로 지정**할 수 있습니다. 종일로 두면 시각 입력 없이 저장되고 "종일"로 표시되며, 외부 캘린더에도 날짜 단위 종일 일정으로 반영됩니다.

  ([#740](https://github.com/idean3885/trip-planner/issues/740))
- * **활동·일자 다건 삭제 API**를 추가했습니다. 여러 활동이나 일자를 한 요청으로 한 번에 지울 수 있어, 항목마다 따로 삭제하지 않아도 됩니다.
  * **단건 삭제는 그대로 유지**합니다. 다건 삭제는 보조 수단으로 더해졌고, 없는 항목이 섞여도 나머지는 정상 삭제하며 삭제·건너뜀 결과를 함께 돌려줍니다.

  ([#743](https://github.com/idean3885/trip-planner/issues/743))
- * **여행 일정을 활동까지 한 번에 읽는 API**를 추가했습니다. 여행을 조회할 때 활동을 함께 요청하면 각 일자의 활동 전체를 한 응답으로 받을 수 있어, 일자마다 따로 조회하지 않아도 됩니다.
  * **활동을 돌려주는 조회 경로를 API 문서에 노출**했습니다. 문서만 보고도 활동 목록을 식별자와 함께 가져오는 방법을 찾을 수 있습니다.

  ([#744](https://github.com/idean3885/trip-planner/issues/744))


## [3.13.0] - 2026-06-02

### Added

- 모바일에서 아래로 스크롤해 캘린더가 화면 상단에 고정되면 캘린더가 월간에서 주간으로 접혀 일정 영역을 넓게 씁니다. 맨 위로 돌아오면 월간으로 복원됩니다.

  스크롤로 캘린더가 고정돼도 월간이 그대로 남아 일정 영역을 좁히던 문제를 줄이기 위함입니다. ([#736](https://github.com/idean3885/trip-planner/issues/736))

### Fixed

- 여행 상세 액션바의 "일자 삭제" 버튼을 다른 액션 버튼과 같은 외곽선 스타일로 통일했습니다. 삭제 의미는 글자색으로만 구분합니다.

  이 버튼만 테두리 없는 강조 스타일이라 버튼 줄에서 혼자 튀어 보였기 때문입니다. ([#734](https://github.com/idean3885/trip-planner/issues/734))
- 주간 캘린더를 좌우로 슬라이드해 전/다음 주로 이동하면 이동한 주의 첫 요일(일요일)이 선택됩니다.

  지금까지는 같은 요일에 머물러 이동한 주를 처음부터 살펴보기 불편했기 때문입니다. ([#738](https://github.com/idean3885/trip-planner/issues/738))


## [3.12.0] - 2026-06-02

### Added

- 활동 카드를 탭하면 읽기 전용 상세가 펼쳐지고, 상세의 "편집" 버튼을 눌러야 입력이 활성화됩니다.

  탭하면 곧장 편집 화면이 열려 내용만 확인하려 해도 의도치 않게 편집에 진입하던 불편을 없애기 위함입니다. ([#712](https://github.com/idean3885/trip-planner/issues/712))
- 활동 상세·카드의 링크를 클릭하면 새 탭 대신 팝업 창으로 열립니다.

  새 탭으로 넘어가면 여행 화면 맥락을 벗어나던 불편을 줄이기 위함입니다. ([#714](https://github.com/idean3885/trip-planner/issues/714))

### Fixed

- 활동 상세·편집 폼에서 비용·통화·예약 여부를 메모 위로 옮기고, 메모 영역에 최소 높이를 확보했습니다. 장소 입력에는 지도·캘린더 연동 안내를 붙여 메모와의 차이를 분명히 했습니다.

  핵심 정보가 메모 아래로 떨어져 있고 메모가 좁아 잘려 보이던 문제를 고치기 위함입니다. ([#713](https://github.com/idean3885/trip-planner/issues/713))
- 활동을 추가·수정·삭제하거나 외부 일정을 가져와 확정하면 연결된 외부 캘린더에 자동으로 반영됩니다.

  지금까지는 수동 "다시 반영하기"를 눌러야만 반영되어, 화면 안내(자동 반영)와 실제 동작이 어긋났기 때문입니다. ([#715](https://github.com/idean3885/trip-planner/issues/715))
- 캘린더가 화면 상단에 고정되는 경계에서 스크롤을 강제로 멈추던 보정을 제거하고 네이티브 자유 스크롤로 되돌렸습니다.

  여러 방식으로 시도한 경계 멈춤이 기기·환경에 따라 동작하지 않거나 스크롤이 끊기는 부작용을 남겨, 보정을 두기보다 없애는 편이 낫다고 판단했기 때문입니다. ([#730](https://github.com/idean3885/trip-planner/issues/730))


## [3.11.0] - 2026-06-02

### Added

- 여행 기간(시작일·종료일)을 한 번에 지정·수정할 수 있습니다. 기간을 늘리면 일자가 자동으로 생기고, 줄여서 기존 일자와 활동이 사라질 때는 삭제 대상을 경고로 알리고 확인을 받은 뒤 삭제합니다.

  하루씩만 더할 수 있어 기간 조정이 번거롭고, 기간을 줄일 때 활동이 알림 없이 사라질 수 있었기 때문입니다. ([#720](https://github.com/idean3885/trip-planner/issues/720))
- 선택한 일자가 주소에 반영되어 새로고침하거나 링크를 공유해도 같은 일자가 유지됩니다.

  선택 일자가 화면 상태로만 있어 새로고침하면 처음으로 돌아갔기 때문입니다. ([#724](https://github.com/idean3885/trip-planner/issues/724))

### Fixed

- 여행 상세 헤더를 정리했습니다. 브레드크럼에 여행 기간 날짜를 함께 표기하고, 기간 편집·동행자 초대·여행 나가기·캘린더 동기화·선택 일자 삭제 버튼을 한 줄에 모았습니다. 캘린더는 가로 폭을 채우고 세로 길이를 제한했습니다.

  버튼이 여러 줄로 흩어져 공간을 낭비하고, 캘린더가 한쪽에 몰려 여백이 비었으며, 작은 화면에서 일자를 삭제할 방법이 없었기 때문입니다. ([#721](https://github.com/idean3885/trip-planner/issues/721))
- 캘린더 동기화를 열면 동기화 내용이 바로 보입니다. 중간 단계 버튼을 한 번 더 누르지 않습니다.

  진입 후 한 단계를 더 거쳐야 동기화 화면에 닿아 번거로웠기 때문입니다. ([#722](https://github.com/idean3885/trip-planner/issues/722))
- 일정 패널 높이를 현재 보고 있는 일자에 맞춰 짧은 일자 아래에 남던 빈 공간을 없앴습니다. 캘린더 경계에서 멈추는 스크롤 기준을 화면 비율 대신 실제 고정 위치로 바꾸고, 데스크탑에서는 캘린더를 고정해 일정이 길어도 함께 보이도록 했습니다.

  가장 긴 일자에 패널 높이가 맞춰져 빈 스크롤이 생기고, 경계 멈춤이 동작하지 않았기 때문입니다. ([#723](https://github.com/idean3885/trip-planner/issues/723))


## [3.10.0] - 2026-06-02

### Added

- 로그인 후 홈에서 여러 여행을 한데 모아 보던 월 캘린더를 제거하고 여행 목록만 보여줍니다. 홈의 1차 목적인 여행 선택에 집중하도록 화면을 단순화하기 위함입니다. ([#703](https://github.com/idean3885/trip-planner/issues/703))
- 여행 상세 캘린더가 화면 가로폭을 채우고, 넓은 화면에서는 날짜 칸에 일정 제목이 보입니다. 좁은 화면은 도트로 일정 유무를 표시하고, 세로 스크롤은 캘린더 경계에서 한 번 멈춘 뒤 이어지며, 일정이 없는 날의 빈 여백도 줄였습니다. 캘린더를 한눈에 보기 편하게 하기 위함입니다. ([#704](https://github.com/idean3885/trip-planner/issues/704))
- 여행 상세 헤더를 `여행 목록 > 제목` 브레드크럼 한 줄로 줄이고, 날짜 옆 "일정 변경"으로 과거·미래 날짜를 자유롭게 추가해 여행 기간을 바꿀 수 있습니다. 호스트·게스트 초대는 "동행자 초대" 한 곳으로 합쳐 동행자 목록·역할 설명·초대 링크 복사를 한 다이얼로그에서 처리하고, 기존 "자세히"는 "캘린더 동기화"로 분리했습니다. 모바일에서는 두 다이얼로그가 화면을 채우는 시트로 열립니다. 화면을 간결하게 하고 역할 차이를 분명히 보여주기 위함입니다. ([#705](https://github.com/idean3885/trip-planner/issues/705))

### Chore

- 코드 일관성 검사와 포맷 규약을 강화하고 디자인 토큰 외 색상 사용을 검사 단계에서 차단합니다. 신규 화면 작업이 일관된 규칙 위에서 진행되어 유지보수성이 높아지도록 하기 위함입니다. ([#702](https://github.com/idean3885/trip-planner/issues/702))
- 일정을 추가·수정·삭제하면 성공 알림이 떠서 결과를 바로 확인할 수 있습니다. 사용하지 않던 스와이프 컴포넌트와 그 라이브러리를 정리해 유지보수 부담을 줄였습니다. 인터랙션 피드백을 일관되게 하고 코드를 단순화하기 위함입니다. ([#706](https://github.com/idean3885/trip-planner/issues/706))


## [3.9.0] - 2026-05-31

### Added

- * **모바일 트립 상세의 스크롤이 캘린더 경계에서 한 번 멈춥니다.** 위 영역을 스크롤해 캘린더가 상단에 고정되는 지점에서 한 번 멈추고, 그다음부터는 일정이 이어서 스크롤됩니다. 캘린더로 날짜를 고르는 흐름과 일정을 읽는 흐름이 한 번의 스크롤로 뒤섞이지 않습니다. ([#696](https://github.com/idean3885/trip-planner/issues/696))


## [3.8.2] - 2026-05-31

### Fixed

- * **모바일 트립 상세의 일정 스크롤**이 캘린더 고정 경계에서 멈추지 않고 이어집니다. 캘린더는 상단에 고정된 채 일정만 평소 속도로 스크롤됩니다. ([#692](https://github.com/idean3885/trip-planner/issues/692))


## [3.8.1] - 2026-05-31

### Fixed

- * **모바일 트립 상세의 캘린더 고정 경계 스크롤 정지**가 빠르게 내릴 때도 한 번 멈춥니다. 이전에는 스크롤 속도만 전체적으로 줄어든 채 경계를 그대로 지나쳤습니다. ([#688](https://github.com/idean3885/trip-planner/issues/688))


## [3.8.0] - 2026-05-31

### Added

- * **모바일 여행 상세 스크롤이 캘린더 고정 지점에서 한 번 멈춥니다.** 아래로 내릴 때 캘린더가 상단에 붙는 지점에서 정지하고, 위로 올릴 때는 일정이 맨 위에 닿은 뒤에야 캘린더가 풀립니다. 캘린더와 일정이 한 번에 함께 밀려 원하는 위치에 멈추기 어렵던 점을 개선합니다.
  * **일정 위에 중복으로 보이던 날짜 표기를 없앴습니다.** 선택한 날짜는 캘린더에 이미 표시되므로 모바일에서 같은 날짜를 두 번 보이지 않게 합니다.

  ([#681](https://github.com/idean3885/trip-planner/issues/681))

### Fixed

- * **일정을 좌우로 넘길 때 다음 날짜가 아직 불러오는 중이어도 바로 넘어갑니다.** 불러오기가 끝나기 전에는 일정 자리에 자리표시가 보입니다. 데이터를 기다리느라 넘기기가 되돌아오던 점을 고쳤습니다. ([#682](https://github.com/idean3885/trip-planner/issues/682))
- * **일정을 좌우로 넘기면 캘린더의 선택 날짜 표시도 같은 순간에 바뀝니다.** 일정만 먼저 넘어가고 캘린더 표시가 뒤늦게 따라오던 어긋남을 없앴습니다. ([#683](https://github.com/idean3885/trip-planner/issues/683))
- * **여행 정보를 여는 '자세히' 버튼을 또렷한 버튼 모양으로 다듬었습니다.** 글자처럼 흐릿하게 보이던 것을 정리하고 앞의 점 세 개 표시를 없애 버튼임을 쉽게 알아볼 수 있게 합니다. ([#684](https://github.com/idean3885/trip-planner/issues/684))


## [3.7.2] - 2026-05-30

### Fixed

- * **스와이프 영역의 글자·내용이 또렷하게 보입니다.** 넘김을 부드럽게 하려고 둔 화면 합성 처리가 그 부분을 흐릿하게 만들던 것을 없앴습니다. 부드러움은 그대로입니다. ([#677](https://github.com/idean3885/trip-planner/issues/677))


## [3.7.1] - 2026-05-30

### Fixed

- * **날짜를 넘길 때 화면을 다시 그리는 양을 줄여 더 부드럽게 넘어갑니다.** 다른 날짜 일정이 들어와도 보고 있는 칸은 다시 그리지 않고, 한 칸의 변경이 옆 칸 재계산으로 번지지 않게 했습니다. 외형은 그대로입니다. ([#673](https://github.com/idean3885/trip-planner/issues/673))


## [3.7.0] - 2026-05-30

### Added

- * **여행 상세가 모든 날짜의 일정을 한 번에 받지 않고, 선택한 날짜 주변 며칠치만 받아 빠르게 엽니다.** 날짜를 옮기면 다음 일정을 미리 받아두어 기다림 없이 넘어가고, 아직 못 받은 날짜는 잠깐 자리표시 후 채웁니다. 캘린더의 일정 표시일·기간은 그대로입니다.
  * **일정을 추가·수정·삭제하면 날짜를 오가도 그 결과가 그대로 보입니다.** 편집한 내용이 다시 예전 값으로 보이던 경우를 없앴습니다.

  ([#669](https://github.com/idean3885/trip-planner/issues/669))


## [3.6.2] - 2026-05-30

### Fixed

- * **스와이프 달력·일정의 가운데 칸이 화면에 정확히 채워집니다.** 넘긴 뒤 가운데가 살짝 밀려 왼쪽에 이전 기간이 비치던 문제를 고쳤습니다. ([#665](https://github.com/idean3885/trip-planner/issues/665))


## [3.6.1] - 2026-05-30

### Fixed

- * **스와이프로 기간을 넘길 때 끊김을 줄였습니다.** 화면이 바뀌는 무거운 처리를 손을 뗀 뒤로 미루고, 불필요한 재계산을 없애 넘김이 더 부드럽습니다. ([#661](https://github.com/idean3885/trip-planner/issues/661))


## [3.6.0] - 2026-05-30

### Added

- * **캘린더와 일정을 손가락으로 끌어 넘깁니다.** 누른 채 좌우로 움직이면 앞뒤 기간이 따라 보이고, 손을 떼면 가장 가까운 쪽으로 부드럽게 넘어갑니다. 월 달력은 달 단위, 주 달력은 주 단위, 하단 일정은 하루 단위로 이동합니다. 위아래 스크롤은 그대로 동작합니다. ([#657](https://github.com/idean3885/trip-planner/issues/657))


## [3.5.0] - 2026-05-30

### Fixed

- * **모바일 캘린더에서 좌우로 쓸어 기간을 넘깁니다.** 주 보기는 이전·다음 주로, 월 보기는 이전·다음 달로 이동합니다.
  * **하단 일정 영역을 좌우로 쓸면 하루씩 이전·다음 날로 넘어갑니다.** 위아래 스크롤은 그대로 동작합니다.
  * **일정을 누르면 그 자리에서 수정 화면이 펼쳐집니다.** 수정·삭제 버튼이 데스크탑에서만 보여 모바일에서 닿지 않던 문제를 함께 고쳤습니다.

  ([#653](https://github.com/idean3885/trip-planner/issues/653))


## [3.4.4] - 2026-05-30

### Fixed

- * **모바일에서 캘린더 위에 손가락을 대고 쓸어도 화면이 정상 스크롤됩니다.** 캘린더 영역에서 세로 스크롤이 막혀 캘린더 밖을 잡아야만 내려가던 문제를 고쳤습니다. 월·주 보기 전환은 캘린더 아래 버튼으로 합니다. ([#649](https://github.com/idean3885/trip-planner/issues/649))


## [3.4.3] - 2026-05-30

### Fixed

- * **날짜를 누르면 그 날짜의 일정으로 제대로 바뀝니다.** 이전에는 날짜 표시만 바뀌고 일정 목록은 처음 본 날짜 그대로였습니다.
  * **다른 날짜를 누르면 일정 목록이 맨 위부터 다시 보입니다.** 길게 스크롤한 상태에서 날짜를 바꿔도 새 날짜 일정을 처음부터 봅니다.
  * **모바일 캘린더에서 위로 쓸어 주간을 월간으로 펼칠 수 있습니다.** 날짜 칸 위에서 시작한 세로 쓸기가 동작하지 않던 문제를 고쳤습니다.
  * **"자세히"가 펼침이 아니라 창(열기·닫기)으로 바뀝니다.** 동행자와 외부 캘린더 동기화를 한 창에 모아 보여주고, 모바일에서는 동행자를 자세히 안에서만 봅니다.
  * **데스크탑 월간 캘린더가 화면 폭을 더 채웁니다.** 좌측 영역이 비어 보이던 것을 줄이되 캘린더가 과하게 커지지 않게 크기 상한을 뒀습니다.

  ([#645](https://github.com/idean3885/trip-planner/issues/645))


## [3.4.2] - 2026-05-30

### Fixed

- * **모바일 캘린더에서 위아래로 쓸어 월·주 보기를 바꿀 수 있습니다.** 좁은 화면에서 세로 쓸기(스와이프)가 화면 스크롤에 묻혀 동작하지 않던 문제를 고쳤습니다. 탭 버튼도 그대로 씁니다.
  * **좁은 화면(아이폰 13 미니 등)에서 상단 머리말의 가로 넘침을 없앴습니다.** 제목이 한 글자씩 세로로 접히고 로그아웃 버튼이 화면 밖으로 잘리던 문제를 정리했습니다.

  ([#641](https://github.com/idean3885/trip-planner/issues/641))


## [3.4.1] - 2026-05-30

### Fixed

- * **외부 캘린더 가져오기의 시간대 설정을 "지역 표시"로 바꿨습니다.** 시각 숫자를 바꾸는 것이 아니라 이 시각이 어느 지역 시간인지만 기록하는 것임을 분명히 해, 일정을 볼 때 어디 시간인지 바로 알 수 있게 했습니다.
  * **모바일 여행 상세에서 "자세히"를 누르면 동기화·동행자 정보가 바로 나타납니다.** 이전에는 화면 아래쪽에 펼쳐져 눌러도 반응이 없는 것처럼 보였습니다.
  * **모바일 캘린더의 월·주 전환을 탭으로도 할 수 있게 했습니다.** 세로 스와이프가 동작하지 않던 문제도 함께 고쳐, 좁은 화면에서 달력을 더 쉽게 접고 펼칩니다.
  * **좁은 화면에서 일정의 긴 제목·주소·링크로 생기던 가로 스크롤을 없앴습니다.** 아이폰 13 미니처럼 폭이 좁은 기기에서도 화면 안에 맞춰 줄바꿈됩니다.

  ([#637](https://github.com/idean3885/trip-planner/issues/637))


## [3.4.0] - 2026-05-30

### Added

- * **예약 상태에 "예약 완료"를 추가했습니다.** 온라인 등으로 이미 예약을 마친 일정을 그 상태로 표시합니다. 예약이 필요한지(필수·권장·현장·불필요)만 나타내던 것에 더해, 이미 끝낸 예약을 구분합니다.
  * 일정 폼·카드, 외부 일정 가져오기, 외부 캘린더 연동, API와 MCP 도구에서 모두 "예약 완료"를 다룹니다.

  ([#632](https://github.com/idean3885/trip-planner/issues/632))
- * **동기화 타임존 선택 목록에 스페인·포르투갈 등 여행지 타임존을 더했습니다.** 여행지에서 쓰는 시간대를 골라 일정 시각을 현지 기준으로 맞춥니다. 화면마다 달랐던 타임존 목록을 하나로 모아 어디서나 같게 보입니다. ([#633](https://github.com/idean3885/trip-planner/issues/633))


## [3.3.0] - 2026-05-30

### Added

- * **외부 캘린더에서 가져온 일정을 체크박스로 골라 한 번에 가져옵니다.** 가져온 시점에는 저장하지 않고, 시간이 정해지지 않은 일정에 시작 시간을 일괄로 넣거나 타임존을 일괄로 맞추고 개별로 다듬은 뒤 확정할 때 정식 일정이 됩니다.
  * **확정 버튼과 일괄 설정을 화면 위에 고정**해 가져온 일정이 많아도 아래로 스크롤하지 않고 처리합니다. 좁은 화면에서도 가로 스크롤 없이 봅니다.

  ([#626](https://github.com/idean3885/trip-planner/issues/626))

### Fixed

- * **애플 캘린더 연결 화면의 Apple ID 입력란에서 로그인 이메일 자동 채움을 없앴습니다.** 애플 ID와 무관한 값(구글 계정 이메일 등)이 미리 채워져 잘못된 안내를 주던 문제를 정리했습니다. 이미 등록된 애플 ID가 있을 때만 재등록 편의로 채웁니다. ([#627](https://github.com/idean3885/trip-planner/issues/627))


## [3.2.0] - 2026-05-30

### Added

- * **여행 상세를 캘린더 중심 단일 화면으로 재설계**했습니다. 캘린더에서 날짜를 선택하면 다른 페이지로 이동하지 않고 같은 화면에서 그 날짜의 일정을 보고 추가·수정·삭제합니다.
  * **데스크탑**은 캘린더와 동기화 카드를 왼쪽에, 동행자와 선택한 날짜의 일정을 오른쪽에 나란히 둡니다. **모바일**은 캘린더를 위에 고정하고 위로 쓸어올리면 선택한 주만 남겨 일정에 집중하며, 동기화와 동행자는 `자세히`로 모았습니다. 날짜마다 페이지를 오가던 흐름과 중복되던 일자 목록이 사라집니다.

  ([#622](https://github.com/idean3885/trip-planner/issues/622))


## [3.1.2] - 2026-05-29

### Chore

- * **화면 분할 레이아웃의 회귀 테스트 가드**가 현재 사양만 정확히 검증하도록 정정했습니다. 사양이 바뀐 뒤에도 옛 기준을 함께 통과시키던 느슨함이 회귀를 놓칠 수 있었습니다.
  * **미리보기 배포 봇의 변경 요청 알림**을 끕니다. 변경마다 반복 게시되던 알림 소음을 줄여 검토에 집중하기 위함입니다.

  ([#616](https://github.com/idean3885/trip-planner/issues/616))


## [3.1.1] - 2026-05-29

### Fixed

- * **테스트 자동 검증의 간헐 실패**를 해소했습니다. 같은 commit 을 다시 돌릴 필요 없이 CI 결과를 한 번에 받습니다. ([#581](https://github.com/idean3885/trip-planner/issues/581))


## [3.1.0] - 2026-05-29

### Added

- * **여행 상세·목록 화면**을 좌측 캘린더 / 우측 메타 두 컬럼으로 재구성했습니다. 가운데에 끼어 있던 안내 영역을 정리해 캘린더가 화면의 절반을 차지하게 됩니다.
  * **캘린더 연속 일자 표시**를 가로 띠로 바꿨습니다. 멀티데이 여행이 한 줄로 이어진 색 띠로 보여 일정 흐름을 한 눈에 파악할 수 있습니다.
  * **캘린더 날짜 클릭**이 곧바로 해당 일자 화면으로 이동합니다. 중간 안내 단계를 거치지 않아 한 번의 클릭으로 일정 상세에 도달합니다.
  * **여행 목록 페이지 좌측 캘린더**가 사용자가 속한 모든 여행을 색별로 묶어 보여줍니다. 다음 여행이 언제인지 목록 화면에서 즉시 확인할 수 있습니다.

  ([#608](https://github.com/idean3885/trip-planner/issues/608))


## [3.0.0] - 2026-05-28

### Breaking

- * **여행 생성·수정 시 기간 입력이 제거**됩니다(BREAKING). 여행을 만들 때 시작·종료 날짜를 직접 지정하지 않고 제목만 입력하면 됩니다. 첫 일정을 추가하는 순간 여행 기간이 자동으로 설정되어 사용자가 두 정보(명목 기간·실제 일정 범위)를 동시에 관리하던 마찰이 사라집니다.
  * **여행 API 응답의 기간이 일정에서 자동 계산된 값으로 통일**됩니다(BREAKING). 일정 0건 여행은 기간이 `null` 로 응답되며 화면은 "일정 미정" 으로 표시됩니다. 기존 명목 기간 컬럼은 데이터베이스에서 영구 제거됩니다.
  * **외부 API 호출에 `startDate`/`endDate` 입력은 거부**됩니다(400). `POST /api/trips`, `PUT /api/trips/<id>`, `PUT /api/v2/trips/<id>` 모두 같은 정책입니다. v2.x 까지 보낸 클라이언트는 본 필드만 빼고 다시 호출하면 됩니다.

  ([#601](https://github.com/idean3885/trip-planner/issues/601))

### Added

- * **MCP 설치를 1줄 명령으로 끝낼 수 있습니다.** `curl -fsSL https://trip.idean.me/install | bash` 한 줄이면 런타임 진단·패키지 설치·브라우저 인증·MCP 등록·동작 검증까지 자동으로 진행됩니다. 협력자가 설치 단계에서 막혀 도구를 못 쓰던 마찰이 사라집니다.
  * **브라우저 인증이 한 번이면 끝**입니다. install 스크립트가 로컬에 임시 리스너를 띄우고 사용자가 브라우저에서 한 번만 동의하면 자동으로 인증 토큰이 발급·저장됩니다. 토큰 평문은 브라우저 주소창과 서버 로그 어디에도 남지 않도록 fragment 로만 전달됩니다.
  * **인증 토큰은 macOS Keychain 에 안전하게 저장**됩니다. Linux 환경은 토큰 파일을 사용자 전용 권한(0600)으로 저장하며, 두 환경 모두 외부 프로세스가 토큰 평문을 읽을 수 없습니다.

  ([#602](https://github.com/idean3885/trip-planner/issues/602))


## [2.18.0] - 2026-05-28

### Added

- * **여행 기간 표시**가 등록된 일정에서 자동 계산된 값을 따릅니다. 일정을 추가·수정·삭제하면 여행 헤더·API 응답·외부 캘린더 가져오기 범위가 새로고침 없이 즉시 갱신됩니다.
  * **외부 캘린더 가져오기**가 일정 0건 여행에서는 "일정 0건이라 기간이 정해지지 않았습니다" 안내로 막힙니다. 가져올 범위가 정해지지 않은 상태에서 부정확한 일정이 끌려오는 일을 사전에 막기 위함입니다.

  ([#588](https://github.com/idean3885/trip-planner/issues/588))
- * **여행 상세에 월별 캘린더가 항상 노출**됩니다. 데스크탑에서는 좌 캘린더 + 우 사이드 일정 리스트로 나뉘고, 모바일에서는 캘린더 위 + 하단 일정 리스트로 쌓입니다. 사용자는 "오늘 며칠?", "복귀날 언제?"를 한 화면에서 즉시 확인할 수 있습니다.
  * **모바일에서 날짜를 누르면 하단이 그 날의 일정으로 바뀌고, 좌 스와이프·"뒤로" 버튼·ESC 키로 기본 일정 목록으로 돌아옵니다.** URL은 변경되지 않아 브라우저 뒤로가기는 이전 페이지로 이동하는 흐름이 그대로 유지됩니다.
  * **여행 기간이 캘린더에 강조 표시**되며, 일정이 등록된 날짜에는 점이 표시됩니다. 오늘 날짜도 함께 강조되어 여행 일정 안에서 현재 위치를 바로 알 수 있습니다.

  ([#589](https://github.com/idean3885/trip-planner/issues/589))
- * **여러 여행을 같은 캘린더에서 켜고 끌 수 있습니다.** 여행 상세 사이드에 내가 속한 여행 목록이 체크박스로 노출되며, 다른 여행을 체크하면 그 여행의 일정 날짜가 캘린더에 함께 점으로 표시됩니다. 청첩장 모임 같은 단발 행사까지 묶어 "내 일정 전체"를 한 화면에서 확인할 수 있습니다.
  * **여행 라벨 색이 자동 부여**됩니다. 각 여행은 6색 중 하나를 결정적으로 받아 사이드 체크박스에 색 점으로 표시됩니다. 같은 여행은 다시 들어와도 같은 색을 유지합니다.
  * **체크박스 상태가 기억**됩니다. 다른 여행을 켜둔 채 다른 페이지로 이동했다 돌아와도 같은 상태가 복원됩니다. 현재 보고 있는 여행은 항상 체크된 상태로 유지됩니다.

  ([#590](https://github.com/idean3885/trip-planner/issues/590))
- * **일정이 등록되지 않은 여행은 "일정 미정"으로 표시**됩니다. 여행 목록 카드와 여행 상세 헤더 모두 처음 입력한 기간을 그대로 노출하지 않고 "일정 미정" 라벨을 보여줍니다. 기간만 정해두고 일정이 비어 있는 상태를 분명히 드러내 사용자가 다음 액션을 인지하도록 합니다.
  * **일정 0건 여행의 상세 화면 캘린더 상단에 안내 카드**가 노출됩니다. "일정을 추가하면 캘린더에 기간이 강조됩니다" 안내로 사용자가 어떤 동작을 해야 화면이 채워지는지 바로 알 수 있습니다.

  ([#591](https://github.com/idean3885/trip-planner/issues/591))
- * **통합 캘린더에서 여행마다 다른 색 점이 표시**됩니다. 한 날짜에 여러 여행이 일정을 가지면 각 여행의 색 점이 분리되어 같이 노출됩니다. 같은 날에 겹친 일정을 한눈에 식별할 수 있어야 사용자가 충돌을 즉시 인지하고 조정할 수 있습니다.
  * **사이드 일정 카드에 여행 라벨이 노출**됩니다. 다른 여행을 체크해 통합 보기 중일 때 어느 일정이 어느 여행 소속인지 색 점 + 여행 제목으로 즉시 구분됩니다. 라벨 없이 일정만 나열되면 사용자가 어느 여행 일정인지 추측해야 하던 불편이 해소됩니다.
  * **다른 여행의 일정도 사이드에서 함께 표시**됩니다. 캘린더에서 날짜를 선택하면 체크된 모든 여행의 그 날 일정이 여행별로 묶여 보입니다. 청첩장 모임 같은 단발 행사와 본 여행이 같은 날에 있어도 사이드 영역에서 두 일정을 한 화면에서 확인하고 조정할 수 있습니다.

  ([#595](https://github.com/idean3885/trip-planner/issues/595))


## [2.17.0] - 2026-05-28

### Added

- * **여행 기간 자동 계산 인프라**를 도입했습니다. 등록된 일정에서 시작·종료 날짜를 매번 계산하는 헬퍼가 추가되어 후속 release에서 표시·외부 캘린더 연동·여행 헤더가 실제 일정과 정합하게 갱신될 준비를 마쳤습니다. ([#584](https://github.com/idean3885/trip-planner/issues/584))


## [2.16.10] - 2026-05-28

### Documentation

- * **반응형 viewport 분류**를 용어 정본에 추가했습니다. mobile(<1024px)·desktop(≥1024px) 2단을 단일 정본 정의로 두어 spec·UI·문서 어디서나 같은 명칭을 씁니다. ([#577](https://github.com/idean3885/trip-planner/issues/577))


## [2.16.9] - 2026-05-28

### Fixed

- * **일자(Day) 삭제 버튼**을 일자 상세 화면에 추가했습니다. 일자 단위로 정리할 진입점이 화면에 없어 사용자가 일자를 삭제할 수 없던 상태를 해소합니다. ([#571](https://github.com/idean3885/trip-planner/issues/571))

### Documentation

- * **릴리즈 노트 작성 규칙**을 합쇼체 통일·`왜:` 라벨 제거·감정체 지양으로 강화했습니다. 노트 본문이 부자연스러운 한국어로 출력되던 사례를 정리합니다. ([#573](https://github.com/idean3885/trip-planner/issues/573))


## [2.16.8] - 2026-05-28

### Fixed

- * **여행 목록 페이지**의 큰 제목이 헤더 로고와 중복되지 않도록 정리된다.
    왜: 화면 상단에 같은 문구가 두 번 나타나 시각 노이즈를 일으켰다.
  * **설정 페이지**의 API 문서 링크가 3중 노출에서 정리된다.
    왜: 같은 링크가 페이지 상단·본문·푸터 세 곳에 동시에 나타나 과했다.

  ([#567](https://github.com/idean3885/trip-planner/issues/567))


## [2.16.7] - 2026-05-28

### Fixed

- * **설정 페이지**에 외부 캘린더 진입점이 추가된다.
    왜: v2.16.6에서 만든 외부 캘린더 설정 화면이 메뉴 어디에도 노출되지 않아 사용자가 직접 주소를 입력해야만 도달할 수 있었다. ([#563](https://github.com/idean3885/trip-planner/issues/563))


## [2.16.6] - 2026-05-28

### Fixed

- * **Apple 캘린더 자격증명 등록**이 트립 주인이 아닌 동행자도 가능해졌다.
    왜: 자격증명은 사용자 단위인데 등록 진입점이 주인 권한으로만 열려 있어 동행자만 가진 사용자는 영영 등록할 수 없었다.
  * **외부 캘린더 미연결 안내** 버튼이 사용자별 캘린더 설정 화면으로 이동한다.
    왜: 트립 단위 진입점은 주인이 아니면 막혀 있어 안내 따라가도 등록을 마치지 못했다.

  ([#559](https://github.com/idean3885/trip-planner/issues/559))

### Documentation

- * **릴리즈 노트 작성 규칙**이 What/Why만 적도록 강제된다. 구현 디테일은 일체 제외, 도메인 용어로 추상화.
    왜: 노트 독자는 사용자이지 개발자가 아니므로 파일·함수·내부 동작이 노출되면 의미가 묻힌다. ([#559](https://github.com/idean3885/trip-planner/issues/559))


## [2.16.5] - 2026-05-27

### Fixed

- **Apple 연결 안내 링크 6곳**을 trip 단위 진입점(`/trips/<id>/calendar/connect-apple`)으로 정정. 왜: 기존 `/settings/calendars` URL은 존재하지 않아 클릭 시 404로 떨어졌고, 사용자가 Apple 등록 경로에 도달하지 못했다. ([#555](https://github.com/idean3885/trip-planner/issues/555))


## [2.16.4] - 2026-05-27

### Fixed

- **캘린더 동기화 다이얼로그**에 Google·Apple 미연결 안내 카드를 provider별로 노출. 왜: 한쪽만 미연결인 경우 다이얼로그에 등록 진입점이 없어 OAuth 미지원인 Apple 등록 경로를 사용자가 찾지 못했다. ([#551](https://github.com/idean3885/trip-planner/issues/551))


## [2.16.3] - 2026-05-27

### Fixed

- **다이얼로그 — draft 0건 빈 상태 섹션 숨김**. 왜: v2.16.2에서 "외부에서 가져온 일정" 섹션이 draft 0건일 때도 빈 안내로 노출돼 노이즈가 됐다. `<details>` summary가 이미 가져오기 진입점을 안내하므로 drafts 0건이면 섹션 자체 숨김. ([#547](https://github.com/idean3885/trip-planner/issues/547))


## [2.16.2] - 2026-05-27

### Fixed

- **캘린더 동기화 다이얼로그 — 가져오기 섹션 헤더 중복 제거**. 왜: v2.16.1에서 `<details>` summary와 ImportSection 내부 h4가 같은 "외부 캘린더에서 일정 가져오기"를 두 번 표시했다. ImportSection 내부 헤더·중복 안내를 제거. ([#543](https://github.com/idean3885/trip-planner/issues/543))


## [2.16.1] - 2026-05-27

### Fixed

- **캘린더 동기화 다이얼로그 후속 정비** — (1) trip-planner ↔ 외부 캘린더 자동 동기화 상태를 다이얼로그 상단에 강조하고 연결된 캘린더 이름까지 노출해 어디로 push되는지 즉시 보이게 했다. (2) "외부 캘린더에서 일정 가져오기"는 기본 접힌 상태(`<details>`)로 변경 — 가져오기는 선택 옵션. (3) trip-planner가 만든 캘린더(`TripCalendarLink` 전체)는 import 후보에서 무조건 제외 — v2.15.1의 ownerId 필터가 OWNER 아닌 trip의 캘린더를 빠뜨리던 결함 수정. ([#539](https://github.com/idean3885/trip-planner/issues/539))


## [2.16.0] - 2026-05-27

### Added

- **trip 상세의 캘린더 동선을 단일 진입 카드 + 단일 다이얼로그로 통합**. 왜: SidePanel의 캘린더 관련 카드가 분산되어(provider 선택·연결 상태·외부 캘린더 가져오기·draft 목록) 사용자가 무엇이 뭘 하는지 파악하기 어려웠다. SidePanel에 "외부 캘린더 동기화" 카드 1개만 노출하고, 클릭 시 다이얼로그 1개 안에서 연결 상태·가져오기·draft 승격·다시 가져오기·삭제까지 모두 진행(depth 0). OAuth 재동의 redirect 복귀 시 `?calsync=open` 으로 다이얼로그 자동 오픈. 도메인·API·DB 변경 없음. 기존 5종 패널은 후속 v2.16.x patch에서 contract 제거 예정. ([#535](https://github.com/idean3885/trip-planner/issues/535))


## [2.15.1] - 2026-05-27

### Fixed

- **외부 캘린더 import — Google scope 검사 + 진단 안내 분기 추가**. 왜: v2.15.0에서 legacy events-only OAuth scope를 가진 사용자가 import 모달을 열면 "가져올 수 있는 캘린더 없음"으로만 표시되어 원인을 알 수 없었다. 이제 scope 부족 시 "Google 다시 연결" 버튼, 미연결 시 `/settings/calendars` 진입, 모든 캘린더가 trip-planner 관리로 분류된 경우의 안내를 분기로 노출한다. API 응답에 `diagnostics` 필드 추가. 모달 본문의 "Apple 캘린더 가져오기는 후속 릴리즈에서 지원될 예정" 잘못된 안내 제거. ([#531](https://github.com/idean3885/trip-planner/issues/531))


## [2.15.0] - 2026-05-27

### Added

- **외부 캘린더 import — 다른 Google·Apple 캘린더의 일정을 ActivityDraft로 가져오기**. 왜: 사용자가 본인의 다른 캘린더에 쌓아둔 여행 일정을 trip-planner에 다시 입력하지 않고 옮기기 위해. trip 상세 사이드 패널의 "외부 캘린더에서 일정 가져오기"에서 캘린더 1개를 선택하면 trip 기간과 겹치는 이벤트가 draft로 들어오고 "외부 캘린더에서 가져옴" 배지로 표시된다. 카테고리·예약 상태·시간대를 채워 정식 Activity로 승격, 외부 변경 시 "다시 가져오기"로 재동기화. 같은 이벤트는 두 번 가져와도 중복 없음(멱등성). ADR 0003 per-trip-shared-calendar 모델은 그대로 유지(외부 → 내부 단방향). ([#527](https://github.com/idean3885/trip-planner/issues/527))


## [2.14.1] - 2026-05-27

### Added

- **OpenAPI 스펙 후속 정합 — operation별 `security` 명시·모든 4xx 응답에 `Error` 스키마 일관 적용·`cost` 타입 `oneOf` (number/string) 정합**. 왜: v2.14.0 후속 follow-up 항목. 각 엔드포인트가 받는 인증을 per-op 단위로 SDK·LLM이 읽고, 4xx 응답을 클라이언트가 일관된 `{error, code}` 구조로 분기하며, DB Decimal 응답이 문자열로 직렬화되는 동작을 스키마가 표현하게 됐다. ([#520](https://github.com/idean3885/trip-planner/issues/520))

### Documentation

- **`/about` 페이지에 MCP 1줄 설치 명령(`curl ... install.sh`)을 코드블록으로 직접 노출**. 왜: 기존에는 GitHub `mcp/` 디렉토리로 외부 링크만 제공해 일반 사용자가 클릭·이동·읽기 단계를 거쳐야 했다. 사이트에서 바로 복사해 붙여넣을 수 있는 명령을 보여 진입 마찰을 줄였다. ([#521](https://github.com/idean3885/trip-planner/issues/521))


## [2.14.0] - 2026-05-26

### Added

- **OpenAPI 스펙에 operationId 21개·요청 example·Error 코드 필드·N+1 호출 규약·정렬 규약 추가**. 왜: LLM/MCP/SDK 코드젠이 안정 식별자로 매핑 가능해지고, `GET /api/trips/{id}` 응답이 activities를 포함하지 않는다는 사실과 활동 정렬 기준(startTime 우선, sortOrder 동률 보조)이 스펙에 명시됐다. ([#512](https://github.com/idean3885/trip-planner/issues/512))
- **Activity `startTime`/`endTime`을 ISO 8601 datetime으로 정정 + `startTimezone`/`endTimezone`(IANA) 필드 명세 추가**. 왜: 실제 동작은 ISO datetime + IANA timezone이지만 스펙은 `HH:mm` 문자열만 기재해 클라이언트가 시간 입력 방식·타임존 처리 규약을 알 수 없었다. ([#514](https://github.com/idean3885/trip-planner/issues/514))

### Documentation

- **`/about` 페이지에 PAT 발급(`/settings/tokens`)·MCP·AI CLI 연결 안내 섹션 추가**. 왜: 비로그인 페이지·API 문서 어디에도 PAT 발급 경로·MCP 등록 가이드 링크가 없어 외부 자동화 사용자가 동선을 추측해야 했다. ([#513](https://github.com/idean3885/trip-planner/issues/513))


## [2.13.1] - 2026-05-26

### Fixed

- **trip 상세 모바일에서 캘린더·멤버를 일정 위로 복원** (v2.13.0 회귀 hotfix). 왜: 사이드 패널이 본문 끝으로 밀려 모바일 첫 화면에서 캘린더·멤버가 안 보였다. 본문 cell 안 "개요 다음, 일정 전" 위치에 `lg:hidden` SidePanel 인라인 추가 + 기존 사이드 cell은 `hidden lg:block`으로 데스크탑 전용. v2.12.x 위치 회복. ([#509](https://github.com/idean3885/trip-planner/issues/509))

## [2.13.0] - 2026-05-26

### Added

- **여행 주인의 구글 캘린더 권한 회수 상태를 HOST·GUEST에게도 노출**. 왜: 멤버 모달이 주인 토큰 상태를 표시하지 않아 sync 17/17 실패가 반복돼도 원인을 알 수 없었다(#481 후속). REVOKED 상태에서는 트리거 라벨이 "주인 권한 만료"로 전환되고 본문에 재인증 안내·HOST의 "다시 반영하기" 비활성화로 무의미한 재시도를 차단한다. ([#494](https://github.com/idean3885/trip-planner/issues/494))
- **디자인 토큰 SSOT에 반응형 척도 정식화 — breakpoint·container·spacing 9종** (spec 026 묶음 A). 왜: 페이지·컴포넌트가 매번 임의 px 값을 정의하던 관행을 차단하고 데스크탑·모바일 반응형 분기의 단일 출처를 만든다. Tailwind v4가 자동으로 `breakpoint:` prefix·`max-w-content` 유틸리티로 노출. `/docs` 페이지가 기존 `max-w-screen-2xl`을 토큰 기반 `max-w-wide`로 일원화. ([#497](https://github.com/idean3885/trip-planner/issues/497))
- **trip 상세 페이지 데스크탑 다단 레이아웃** (spec 026 묶음 B). 왜: 데스크탑에서 일정 탐색·편집을 다수 수행하는 사용 흐름에 맞춰 본문(Day/Activity) 2/3 + 우측 사이드(캘린더·멤버) 1/3로 분리해 한 화면 정보 밀도를 높였다. 글로벌 layout `<main>`을 `lg:max-w-wide`로 확장해 데스크탑에서 토큰 기반 폭으로 확장; 모바일(<1024px) 폭·동작은 그대로 유지. ([#498](https://github.com/idean3885/trip-planner/issues/498))
- **trip 목록 카드 그리드 + 캘린더 모달 폭 정비** (spec 026 묶음 C). 왜: 데스크탑에서 `/trips` 카드가 한 줄에 1개만 노출돼 좌우 공백이 컸고, 캘린더 다이얼로그도 기본 `sm:max-w-sm`(~384px)이라 정보가 잘렸다. lg:2열·xl:3열 그리드 + 모든 GCalLinkPanel DialogContent에 `sm:max-w-narrow` override로 정리. 모바일(<768)은 1열·풀폭 모달 유지. ([#499](https://github.com/idean3885/trip-planner/issues/499))
- **활동 폼 데스크탑 정렬 + 글로벌 헤더 가로 액션** (spec 026 묶음 D). 왜: 데스크탑에서 ActivityForm이 layout 풀폭(1440px)에 펼쳐져 입력 시선이 분산됐다. `lg:mx-auto lg:max-w-2xl`로 가운데 정렬·폭 제한. 헤더는 데스크탑 ≥1024px에서만 "여행 목록"·"API 문서" 가로 nav를 노출 (`hidden lg:flex`), 모바일은 로고만 유지. ([#500](https://github.com/idean3885/trip-planner/issues/500))

### Chore

- **spec 026 회귀 점검 정리** (묶음 E 마감). 왜: 토큰·페이지·컴포넌트 모든 묶음 머지 후 작업 대상 범위 px 잔존 0건과 quickstart Evidence 토큰 항목을 확정하고, 실 스크린샷 회귀 점검은 prod 배포 후 사용자 직접 캡처로 후속한다. vendored shadcn 1건 예외 사유는 evidence에 명시. ([#501](https://github.com/idean3885/trip-planner/issues/501))


## [2.12.4] - 2026-05-26

### Fixed

- **Google OAuth refresh 실패(`invalid_grant`)를 REVOKED로 정확히 분류**. 왜: refresh_token이 만료·회수되면 Google이 HTTP 400 + `invalid_grant`로 응답하는데 기존 분류기는 401/403만 REVOKED로 매핑해 17/17 sync 실패가 lastError UNKNOWN으로 묻혀 UI에서 "다시 연결하기" 분기가 발동되지 않았다. ([#481](https://github.com/idean3885/trip-planner/issues/481))


## [2.12.3] - 2026-05-26

### Chore

- **GCal sync catch 진입 시 항상 raw 에러 노출** (#481 진단 v3). 왜: 412 conflict·404 매핑 정리 분기에 진단 로그가 없어 17/17 실패의 root cause가 logs에 안 잡혔다. ([#481](https://github.com/idean3885/trip-planner/issues/481))


## [2.12.2] - 2026-05-26

### Chore

- **GCal sync 실패 시 raw Google 에러를 prod logs에 노출** (#481 진단 보강). 왜: v2.12.1 fix 후에도 17/17 실패가 재현되어 reason 분류 외 raw status·message·payload를 추적해야 함. ([#481](https://github.com/idean3885/trip-planner/issues/481))


## [2.12.1] - 2026-05-26

### Fixed

- **Google Calendar sync 실패(events.insert 400)** 수정. 왜: `location: null` 그대로 전달과 `endTime` 미지정 시 zero-duration 이벤트가 Google API에 의해 일괄 거부되어 17/17 활동 sync 실패가 재현됐다. ([#481](https://github.com/idean3885/trip-planner/issues/481))


## [2.12.0] - 2026-05-12

### Added

- `/docs` 페이지를 데스크탑 풀폭 레이아웃으로 전환. 왜: OpenAPI 문서는 AI 에이전트·개발자가 참조하는 자료라 사이드바·본문·코드 샘플 3컬럼을 한 화면에 넓게 보여줘야 함. 기존엔 사이트 공용 `max-w-2xl`에 묶여 가운데가 비어 보였다. ([#477](https://github.com/idean3885/trip-planner/issues/477))


## [2.11.8] - 2026-05-12

### Chore

- **npm 의존성 minor/patch 일괄 업데이트** — next 16.2.6, react/react-dom 19.2.6, prisma 7.8.0, lucide-react 1.14.0, shadcn 4.7.0, vitest 4.1.6 등 17+1개. 왜: dependabot grouped PR이 lockfile sync 깨짐 + 서비스 접근 불가로 자동 처리 실패해 직접 hotfix로 처리 (#472 → #474). ([#473](https://github.com/idean3885/trip-planner/issues/473))


## [2.11.7] - 2026-05-11

### Fixed

- **drift-audit 워크플로우 보고 방식 전환** — main 직접 커밋 대신 errors>0 시 GitHub Issue 자동 생성(중복 방지) + 리포트 artifact 보존. 왜: main 보호 정책 충돌로 도입 후 4주 연속 실패 + 1인 개발에서 자동 적용은 정본을 흐림. ([#466](https://github.com/idean3885/trip-planner/issues/466))


## [2.11.6] - 2026-04-29

### Added

- **Apple 연결됨 카드에 "다시 반영하기" sync 버튼 추가** — `AppleEntryCard`를 client component로 재작성. 마지막 반영 시각·건너뜀·오류 상태 표시 + OWNER/HOST가 클릭 시 `POST /api/v2/trips/[id]/calendar/sync` 트리거(provider=APPLE 분기 자동) + 결과 toast(추가/갱신/삭제/건너뜀/실패 요약). 자격증명 만료 시 위자드 재인증 링크 노출. 왜: v2.11.5까지는 안내만 있고 활동 변경을 외부 캘린더에 반영할 트리거 UI가 없어 사용자가 일정 추가/수정 후 Apple 캘린더에 반영할 방법이 없었다(2026-04-28 검증 피드백). ([#458](https://github.com/idean3885/trip-planner/issues/458))

### Fixed

- **여행 제목 placeholder를 일반 예시로 변경** — `포르투갈 & 스페인 여행` → `예: 제주도 여행`. 왜: trip-planner는 특정 여행 한정 도구가 아닌 범용 플래너 — placeholder가 특정 행선지로 고정되면 사용자가 "이 앱은 그 여행만 위한 것"으로 오해할 수 있다. ([#453](https://github.com/idean3885/trip-planner/issues/453))
- **캘린더 provider 선택 — Google 등록 사용자 진입 경로 명확화** — `CalendarProviderChoice`의 Google 옵션을 Apple과 동일한 카드 형태로 균형 조정. "시작 →" CTA가 카드 전체 클릭 영역으로 노출되어 등록 사용자가 즉시 진입 가능. "등록 문의"는 카드 하단 footer 보조 링크로 약화. 왜: v2.11.5는 "개발자 등록 필요" 안내가 너무 강조돼 이미 등록된 사용자도 진입 경로를 인지하지 못하는 문제. Google Cloud Console의 Test users 등록 여부는 사전 조회 불가능하므로 시도 자체는 누구나 가능하게 두고 미등록은 OAuth consent 단계에서 자동 차단(spec 021)되도록 흐름 일관화. ([#456](https://github.com/idean3885/trip-planner/issues/456))
- **Apple sync UID 불일치 버그 수정** — sync-apple의 update 분기가 ICS UID를 `"placeholder"` 문자열로 잘못 설정해 모든 활동이 동일 UID로 PUT되던 버그. iCloud가 UID 불일치를 새 객체 생성/reject로 처리해 활동 1개 추가·sync 시 캘린더에 2개 생성, 후속 sync에서 UNKNOWN/실패 발생. 신규 PUT은 명시적 `randomUUID()` 생성, update는 mapping URL 마지막 segment에서 UID 추출. apple.ts::putEvent의 filename도 ICS UID와 일치하도록 정렬해 CalDAV 일관성 보장. ([#460](https://github.com/idean3885/trip-planner/issues/460))


## [2.11.5] - 2026-04-28

### Fixed

- **캘린더 연결 UX 일괄 개선** — 미연결 trip에 provider 선택 카드(Apple 권장 + Google 개발자 등록 안내) 도입 + Apple 위자드 4단계를 단일 화면으로 단축(prefill·collapsible 가이드·dash 자동 포맷팅·toast 완료). 왜: 신규 사용자는 Apple이 권장 경로임에도 Google 패널만 먼저 보였고, Apple 위자드 4단계 화면 전환이 허들로 작용해 검증 진입이 어려웠다(2026-04-28 사용자 피드백). spec 024 Clarification 6 "한 trip = 1 provider" 정책 준수. ([#450](https://github.com/idean3885/trip-planner/issues/450))


## [2.11.4] - 2026-04-28

### Fixed

- **Apple 진입 카드 표시 조건 분기** — 이미 다른 provider(Google)에 연결된 trip에서는 Apple 카드를 자동으로 hide. 왜: spec 024 Clarification 6의 "한 trip = 1 provider" 정책에도 불구하고 카드가 노출되어 사용자가 위자드를 끝까지 진행한 뒤에야 `already_linked_other_provider` 차단을 만나는 좌절이 있었다(2026-04-28 dev 피드백). Apple 연결된 trip에는 "연결됨" 안내 카드 표시. Google 패널과의 통합·해제 UI는 v2.12 후속. ([#447](https://github.com/idean3885/trip-planner/issues/447))


## [2.11.3] - 2026-04-28

### Fixed

- **Apple 위자드 에러 메시지 한국어화** — `already_linked_other_provider` 등 백엔드 에러 코드가 사용자 화면에 그대로 노출되던 문제 수정. 왜: 사용자가 "이미 구글에 연결됨" 상태에서 Apple 연결 시도 시 의미 전달이 안 되는 코드 문자열만 보여 다음 행동(기존 Google 해제)을 알기 어려웠다(2026-04-28 dev 검증 피드백). ([#444](https://github.com/idean3885/trip-planner/issues/444))


## [2.11.2] - 2026-04-28

### Fixed

- **dev 환경 OAuth 콜백 후 무한 로그인 루프 fix** — `auth.ts`의 jwt callback에서 prisma `user.findUnique` 호출을 try/catch로 감싸 일시적 prisma 실패(connection 타임아웃·schema mismatch 등) 시 token을 무효화하지 않고 통과시키도록 변경. 왜: v2.11.0 머지 후 dev에서 OAuth 인증 직후 token이 무효화되어 /auth/signin으로 재진입하는 무한 루프가 발생. 단일 prisma 실패가 정상 사용자 세션까지 끊는 fail-closed 정책을 fail-open으로 완화 — #328 stale 감지(user 부재 시 무효화)는 정상 응답에서만 발동하도록 좁힘. ([#441](https://github.com/idean3885/trip-planner/issues/441))


## [2.11.1] - 2026-04-28

### Fixed

- **trip 페이지에 Apple 캘린더 위자드 진입 카드 추가** (`AppleEntryCard`). 왜: v2.11.0 위자드는 페이지 자체로만 존재하고 진입 UI가 없어 사용자가 직접 URL을 입력해야 했다. trip 페이지에서 OWNER에게 한 번에 진입 가능한 카드를 노출해 v2.11.0 가치를 사용자가 체감할 수 있게 한다. ([#438](https://github.com/idean3885/trip-planner/issues/438))


## [2.11.0] - 2026-04-28

### Added

- **Apple iCloud CalDAV 라우트 3종 + service `connectAppleCalendar` 분기 추가**. 왜: 위자드(다음 PR) 진입점 — 자격증명 검증·캘린더 목록·trip 연결 모두 capability "manual" 분기로 멤버 ACL 자동 호출 0회 보장 + manualAclGuidance 안내. ([#417-routes](https://github.com/idean3885/trip-planner/issues/417-routes))
- **Apple iCloud CalDAV sync 분기 추가** — `syncAppleActivities` 모듈 + `service.syncCalendar`의 `link.provider="APPLE"` 분기. 왜: US1(첫 sync) MVP 완성 — Apple link로 연결한 trip의 활동이 iCloud 캘린더에 VEVENT로 반영되어 iPhone Calendar 앱에 표시. Google sync는 그대로 유지(회귀 0). ([#417-sync](https://github.com/idean3885/trip-planner/issues/417-sync))
- **Apple 캘린더 연결 위자드 UI 추가** — `/trips/{id}/calendar/connect-apple` 진입 페이지 + `AppleConnectWizard` 4단계 stepper(사전 확인·가이드·입력 검증·완료) + 재인증 모드(`?apple_reauth=1`). 왜: POC #345의 사용자 가이드를 위자드 형태로 구현 — Apple 사용자가 16자리 앱 암호를 발급·입력하고 자동으로 캘린더가 생성·연결되는 일관 흐름 제공. ([#417-wizard](https://github.com/idean3885/trip-planner/issues/417-wizard))
- **Apple iCloud CalDAV provider 토대 도입** — `appleProvider` 객체, AES-256-GCM 암호화 모듈, `tsdav` 라이브러리 wrapper, ICS VEVENT 변환, `AppleCalendarCredential` 신규 테이블. 왜: 두 번째 캘린더 provider 정식 도입의 토대 — 위자드·라우트·sync 분해는 후속 PR로 분리해 회귀 위험을 단계적으로 관리. ([#417](https://github.com/idean3885/trip-planner/issues/417))

### Documentation

- **Apple iCloud CalDAV provider 정식 피처 spec/plan/tasks 작성** + POC #345 결과물(연구·가이드·스크린샷) 정식 docs/ 편입. 왜: 다음 단계(구현) 전 의사결정 봉합 + 검증 시나리오 합의를 위해 spec PR을 별도로 분리. ([#417](https://github.com/idean3885/trip-planner/issues/417))

### Chore

- **v2 캘린더 라우트 4종을 service 위임으로 슬림화**하고 오너 이관 ACL 정리를 service 모듈로 분리. 왜: provider 추상화 잔여 작업 — 라우트는 인증·파싱만 담당하고 권한·DB·외부 호출은 service에 캡슐화해 후속 #417 Apple 추가 비용을 줄인다. ([#416](https://github.com/idean3885/trip-planner/issues/416))


## [2.10.3] - 2026-04-27

### Fixed

- **자동 sync 워크플로우 PR 생성 권한 fix**: `secrets.AUTO_TAG_PAT` → `secrets.GITHUB_TOKEN` 교체. 왜: PAT에 `pull-requests: write` 미부여로 v2.10.2 첫 발효에서 PR 생성 단계만 실패. workflow의 `permissions: pull-requests: write`가 GITHUB_TOKEN에 자동 적용되어 PAT 의존 제거. ([#425](https://github.com/idean3885/trip-planner/issues/425))


## [2.10.2] - 2026-04-27

### Added

- **멤버 라이프사이클 ACL 동기화에 retain 판정 도입**: 같은 외부 캘린더를 다른 활성 여행이 공유 중일 때, 한 여행의 멤버가 빠져도 그 멤버의 캘린더 ACL은 회수 보류된다(다른 여행 시청 보호). 왜: spec 024 추상화의 첫 가치 표현. 기존 v2.10.x는 무조건 회수해 다른 여행에서 보던 캘린더가 끊어질 수 있던 잠재 회귀를 구조적으로 차단. ([#416](https://github.com/idean3885/trip-planner/issues/416))

### Fixed

- **`GCalLinkPanel` 미등록 분기 테스트 flaky 안정화**: CI coverage 환경에서 base-ui Dialog portal 마운트 지연으로 timeout이 부족하던 단위 테스트의 timeout을 늘림. 사용자 가시 변경 0. 왜: PR #418/#419 머지 시 develop CI에서 일관 실패 → 재실행으로만 통과되던 패턴을 구조적으로 해소. ([#420](https://github.com/idean3885/trip-planner/issues/420))

### Documentation

- **WORKFLOW 현실화 + main→develop 자동 sync 워크플로우 도입**: v2.7.0 이후 정착된 `release/* → main 직접 머지` 패턴을 CLAUDE.md·docs/WORKFLOW.md에 명문화하고, release 머지 직후 sync PR을 자동 생성하는 GitHub Actions(`sync-main-to-develop.yml`)를 추가. 왜: 매 릴리즈마다 main이 develop보다 앞서고, 누군가 수동으로 sync PR을 만들지 않으면 다음 작업이 누락 베이스 위에서 시작되는 구조적 마찰이 반복됐다. ([#413](https://github.com/idean3885/trip-planner/issues/413))

### Chore

- **캘린더 provider 추상화 — Google 구현체 채움 + service skeleton**: Foundation의 인터페이스 stub을 실제 구현으로 교체. `googleProvider`의 인증·캘린더 관리·멤버 ACL·에러 분류(6종 vocabulary) 메서드가 기존 `src/lib/gcal/*` 함수에 위임. retain 판정(다른 여행에서 같은 캘린더 활성 사용 중이면 ACL 회수 보류) 도입. 라우트 위임 교체는 후속 PR로 분리해 회귀 검증 단순화. 왜: 후속 Apple 도입(#417) 시 같은 인터페이스에 Apple 구현체만 추가되도록 토대를 단계적으로 채운다. ([#416](https://github.com/idean3885/trip-planner/issues/416))


## [2.10.1] - 2026-04-27

### Fixed

- **캘린더 패널 "상태를 불러오지 못했습니다" 회귀 수정**: v2.10.0(spec 022)에서 폐기한 레거시 status 라우트를 클라이언트가 계속 호출하던 문제를 v2 엔드포인트로 마이그레이션. 왜: 호스트·게스트가 캘린더 연결 상태와 추가 버튼을 전혀 볼 수 없었다. ([#410](https://github.com/idean3885/trip-planner/issues/410))

### Documentation

- **문서·스펙·도메인 정합성 정리**: ERD/DOMAIN에 캘린더 컨텍스트(v2.9.0+) 추가 + Day.sortOrder 잔존 표기 제거, spec 015~023 메타를 실제 릴리즈 버전으로 갱신, glossary 복수 역할 뱃지·캘린더 이원 표기 보강, ADR 0005 expand-and-contract 패턴 신설. 왜: v2.10.0 직후 문서가 코드 현실과 어긋나 후속 작업의 베이스 신뢰가 떨어졌다. ([#407](https://github.com/idean3885/trip-planner/issues/407))


## [2.10.0] - 2026-04-23

### Added

- 이벤트 매핑을 공유 캘린더에 직접 귀속하도록 재설계. 왜: 기존 per-user bridge 재사용 로직이 혼선·중복 데이터의 원천이었다. 레거시 테이블·라우트는 무중단 배포를 위해 남기고 후속 릴리즈에서 drop 예정. ([#402](https://github.com/idean3885/trip-planner/issues/402))
- 동행자 목록의 주인 항목에 "주인"+"호스트" 두 뱃지를 병렬 표시. 왜: 주인이 호스트 권한을 포함한다는 역할 계층이 UI에 드러나지 않아 혼선이 있었다. ([#403](https://github.com/idean3885/trip-planner/issues/403))


## [2.9.2] - 2026-04-22

### Added

- 구글 캘린더 연동이 개발자 등록 사용자에게만 제공되는 사실을 UI·문서에 정직하게 전달. 왜: 심사 전 단계라 미등록 사용자가 일반 실패 토스트만 보고 원인·해결을 몰랐다. ([#399](https://github.com/idean3885/trip-planner/issues/399))

### Documentation

- 과한 Evidence 요구 경량화. 왜: 템플릿 규약은 자동 테스트 OR 수동 체크리스트 최소 하나이며 스크린샷·모바일 device mode·1주 운영 로그는 과한 정형화였다(1인 개발 전제). ([#395](https://github.com/idean3885/trip-planner/issues/395))


## [2.9.1] - 2026-04-22

### Added

- 주인이 공유 캘린더를 아직 연결하지 않은 여행에서 호스트·게스트에게도 같은 위치에 안내 전용 다이얼로그를 제공. 왜: 이전에는 작동하지 않는 "내 구글 캘린더에 추가"·"다시 반영하기" 버튼이 노출돼 404 오류가 발생했다. ([#395](https://github.com/idean3885/trip-planner/issues/395))


## [2.9.0] - 2026-04-22

> 이번 릴리즈부터 각 엔트리는 **What** (한 줄 요약) + **Why** (배경 1줄)로 단순화.

### Breaking

- **여행당 1개 공유 캘린더 모델**로 전환. 왜: v2.8.0은 멤버마다 개인 캘린더를 만들어 여행 1개에 N개 중복 생성됐다. v2.8.0 오너 캘린더는 자동 승격 재사용, 다른 멤버 캘린더는 앱 내 연결 해제. 레거시 API는 다음 릴리즈에서 제거. ([#355](https://github.com/idean3885/trip-planner/issues/355))

### Added

- **오너 공유 캘린더 연결 API** (`POST/DELETE /api/v2/trips/{id}/calendar`). 왜: 연결 시 현재 멤버 전원에게 역할별 ACL을 서버가 한 번에 부여. ([#356](https://github.com/idean3885/trip-planner/issues/356))
- **멤버 라이프사이클 ACL 자동 동기화**. 왜: 가입·역할 변경·탈퇴·오너 이관 시점에 서버가 자동으로 ACL을 맞춰, 오너의 수동 조작 없이 권한 일관성 유지. ([#357](https://github.com/idean3885/trip-planner/issues/357))
- **멤버 수동 subscribe 엔드포인트** (`POST/DELETE /api/v2/trips/{id}/calendar/subscribe`). 왜: "안 쓸 자유"를 보장하면서 필요한 멤버만 옵트인으로 본인 GCal에 띄우도록. ([#358](https://github.com/idean3885/trip-planner/issues/358))
- **공유 캘린더 sync 엔드포인트** (`POST /api/v2/trips/{id}/calendar/sync`). 왜: 오너 토큰 1개로만 쓰기가 들어가 중복 이벤트가 원천 차단. ([#359](https://github.com/idean3885/trip-planner/issues/359))
- **역할별 트립 페이지 UI**. 왜: 오너는 연결/sync/해제, 멤버는 내 캘린더 추가/제거만 보여 조작 실수와 혼선을 최소화. ([#360](https://github.com/idean3885/trip-planner/issues/360))

### Documentation

- **ADR 0003 — 여행당 1개 공유 캘린더**. 왜: 모델 선택·거절된 대안·후속 contract 타임라인을 한 곳에 고정. ([#363](https://github.com/idean3885/trip-planner/issues/363))

### Fixed

- **v2.8.0 트립의 멤버 ACL 자동 복구**. 왜: 백필 SQL은 Google API를 호출하지 못해 ACL이 누락됐고, 오너가 "다시 반영하기"를 누르면 sync 전에 ACL을 idempotent하게 복구하도록 했다.
- **subscribe 동의 복귀 후 자동 재시도**. 왜: `?gcal=subscribed` 쿼리를 auto-retry 화이트리스트에 추가해 "한 번 더 누르기" 수고 제거.
- **"건너뛴 이벤트" 카운터 누적 버그**. 왜: sync마다 누적되던 `skippedCount`를 현재 run의 실제 값으로 덮어쓰도록 변경.
- **subscribe 성공 후에도 안 바뀌는 UX**. 왜: 상태 응답에 `mySubscription`을 추가해 ADDED 상태면 컴팩트 카드(오너 "연결됨" 카드와 동일 톤)로 전환.
- **412 오탐으로 앱 편집이 Google에 안 밀리는 문제**. 왜: 412 시 **컨텐츠 비교 → 타임스탬프 비교** 순서로 판정해, 진짜 사용자 GCal 편집일 때만 `skipped`로 남긴다.
- **호스트가 본인 편집을 sync 트리거 못 하던 문제**. 왜: 호스트도 트립 편집 권한이 있으므로 "다시 반영하기"를 쓸 수 있도록 확장(서버는 오너 토큰으로 수행).

### Fixed

- **v2.8.0 마이그레이션 트립의 멤버 ACL 자동 복구 + 동의 후 자동 subscribe**: 백필 SQL은 DB의 TripCalendarLink 승격만 수행하고 Google 쪽 ACL 부여는 하지 못하므로, 승격된 트립에서 멤버가 "내 구글 캘린더에 추가"를 눌러도 404로 실패하는 문제를 해소. 오너가 "다시 반영하기"를 누르면 sync 전에 현재 멤버 전원에게 ACL을 idempotent하게 upsert해 Google 쪽 권한을 복구한다. 또 멤버가 subscribe 시 calendar scope 동의를 완료하고 돌아오면 자동으로 subscribe가 재시도되도록 `?gcal=subscribed` 쿼리를 auto-retry 대상에 추가.
- **"직접 수정하여 건너뛴 이벤트" 카운터가 누적되는 문제**: sync를 누를 때마다 동일 이벤트가 반복 카운트되어 숫자가 선형 증가하던 버그 수정. 이번 sync의 실제 건너뛴 수로 덮어쓰도록 변경(v2 sync·v1 sync·v1 link 모두). 사용자 직접 수정 이벤트가 해결되면 다음 sync에서 자동으로 0으로 리셋된다.
- **멤버 "내 구글 캘린더에 추가" 후에도 버튼·안내문이 그대로 유지되던 UX 이슈**: 상태 응답에 본인 subscription 상태(`mySubscription`)를 함께 반환하고, 패널은 `ADDED` 상태면 "내 캘린더에 추가됨" 배지 + "제거" 단일 버튼의 컴팩트 카드로 전환한다. 오너 쪽 "연결됨" 카드와 동일한 톤.
- **412 Precondition 처리 개선 — "건너뛴 이벤트"의 오탐 제거**: 412 시 Google 현재 이벤트의 **컨텐츠(summary·description·location·start·end)**를 우리가 설정하려는 값과 먼저 비교한다. 같으면 ETag만 밀린 상태로 판단해 조용히 갱신(`updated`). 다를 때만 Google `updated`와 `lastSyncedAt`을 비교하여, 우리 앱 편집이면 재-patch로 밀고 Google 편집이면 `skipped`로 보존. 결과적으로 "사용자가 GCal에서 직접 수정한 경우에만" skipped에 잡힌다.

### Chore

- **레거시 status 라우트가 공유 모델 응답으로 어댑트**. 왜: 기존 MCP 클라이언트가 v2.9.0 이후에도 같은 응답 형식을 받도록 뒤호환 유지. ([#361](https://github.com/idean3885/trip-planner/issues/361))
- **quickstart Evidence 섹션 충족**. 왜: PoC 실측(#349) + 피처 PR CI를 증거로 연결, 통합 테스트는 별도 후속 이슈로 분리. ([#362](https://github.com/idean3885/trip-planner/issues/362))


## [2.8.0] - 2026-04-21

### Added

- Day 모델 구조적 재설계 — `dayNumber`를 `(date - trip.startDate) + 1`로 파생하는 자연키 모델로 전환. `Trip.startDate`/`endDate` NOT NULL + `Day(@@unique([tripId, date]))` 제약 추가. Day POST/PUT 시 Trip 범위 밖 date면 Trip 범위가 자동 확장된다. expand-and-contract 패턴의 expand+migrate 단계, contract(`sortOrder` 컬럼 DROP)는 #317에서 후속 트래킹. ([#296](https://github.com/idean3885/trip-planner/issues/296))
- API 버저닝 v1 유지 + v2 신설 (`/api/v2/trips/...`). v1 응답 스키마는 무변경(MCP 호환), v2는 `dayNumber` 중심 응답. 웹 UI는 v2로 전환되며 MCP는 v1 그대로 사용. SemVer 관점: 외부 계약 추가만 있으므로 MINOR. ([#304](https://github.com/idean3885/trip-planner/issues/304))
- **Google Calendar 연동 도입(1차)**: 여행 상세 페이지에서 "구글 캘린더에 올리기" 한 번으로 본인 Google Calendar에 여행 활동을 이벤트로 export/갱신/삭제할 수 있다. 동일 여행 재반영 시 중복 이벤트가 생기지 않고, 사용자가 구글 캘린더에서 직접 수정한 이벤트는 ETag 불일치로 감지해 덮어쓰지 않고 "건너뜀"으로 고지한다. 공유 여행에서는 각 멤버가 본인 계정으로만 실행하며 타 멤버 캘린더를 자동 변경하지 않는다. 기존 iCal 경로(`che-ical-mcp`)는 변경 없이 공존한다. Resolves #150. ([#305](https://github.com/idean3885/trip-planner/issues/305))

### Fixed

- v2.7.0 expand-and-contract 패턴의 contract 단계 — `Day.sortOrder` 컬럼을 DB에서 제거. v1 응답(`/api/trips/...`)의 `sortOrder` 키는 dayNumber 동적 계산으로 그대로 응답되어 MCP 호환 100% 유지. 데이터 손실 없음(컬럼 값은 모두 `(date - trip.startDate) + 1`로 정확히 복원 가능). ([#317](https://github.com/idean3885/trip-planner/issues/317))
- **활동 시간 표기 개선**: `13:00 GMT+9` 대신 `13:00 KST`, `20:15 WEST`처럼 지역 친화 약어로 표시. 주요 IANA 존 화이트리스트 + DST 반영(여름/겨울 다른 약어). 화이트리스트 밖이거나 ICU가 약어를 못 주는 경우 도시명으로 폴백. ([#325](https://github.com/idean3885/trip-planner/issues/325))
- **#318 DB 분리 이후 stale JWT 세션으로 인한 여행 생성 실패 수정**: `neondb` / `neondb_dev` 분리 이전에 발급된 쿠키를 가진 사용자는 새 DB에 존재하지 않는 `user.id`를 세션에 담고 있어 `POST /api/trips`에서 `Trip.createdBy` FK 위반(Prisma P2003)으로 실패했다. Auth.js `jwt` 콜백에서 토큰 userId의 DB 실존을 검증하고 없으면 세션을 무효화하여 자동 재로그인 흐름으로 유도한다. 향후 DB 이관·초기화 상황에서도 재발하지 않는 구조적 가드. ([#328](https://github.com/idean3885/trip-planner/issues/328))
- **Stale Auth.js 쿠키로 인한 OAuth 재시작 꼬임 방어 (#329 후속)**: `#328`의 JWT 가드가 세션을 무효화해도 `pkce.code_verifier` / `state` / `callback-url` 같은 Auth.js 부수 쿠키가 브라우저에 남아, 재로그인 흐름이 Google OAuth 중간 단계에서 꼬이거나 엉뚱한 URL로 리디렉트되는 현상을 확인. middleware가 비로그인 판정 시 해당 쿠키 존재 여부를 확인하고, 남아 있으면 리디렉트 응답에서 `Max-Age=0`으로 즉시 정리한다. `/auth/signin` 진입 시 `?stale=1` 쿼리가 붙으면 "이전 세션이 유효하지 않아 자동으로 정리했습니다" 안내를 노출. 사용자에게 "쿠키를 직접 지우세요"를 요구하지 않아도 되도록 구조적으로 방어한다. ([#330](https://github.com/idean3885/trip-planner/issues/330))
- **Auth.js 재동의 후 Account.scope 동기화로 GCal consent 루프 해소 (#332)**: `@auth/prisma-adapter`가 기존 Account row가 있을 때 `linkAccount`를 호출하지 않아 재로그인 시 새로 받은 `access_token` / `refresh_token` / `scope` / `expires_at`이 DB에 반영되지 않는 알려진 동작이 있다. GCal `calendar.events` scope 증분 동의 성공 후에도 DB의 `Account.scope`가 옛 값이어서 `hasCalendarScope()`가 계속 false → 다시 consent → 무한 루프. `signIn` 콜백에서 OAuth Account를 직접 updateMany로 upsert해 재동의 결과가 항상 DB에 반영되도록 한다. 보조로 `GCalLinkPanel`의 자동 재시도에 `sessionStorage` 기반 1회 제한을 두어, 혹시 다시 consent_required가 떠도 사용자가 빠져나올 수 있게 한다. ([#332](https://github.com/idean3885/trip-planner/issues/332))
- **구글 동의 화면 취소 시 "Server error" 대신 친절한 안내 (#334)**: Google OAuth 동의 화면에서 사용자가 "취소"하면 Google이 `iss` 없는 error 응답을 보내고 Auth.js v5가 이를 Configuration 에러로 승격, 기본 `/api/auth/error` 페이지의 "Server error" 문구로 이어지는 UX 회귀가 있었다. `auth.config.ts`에 `pages.error = "/auth/signin"`을 지정해 에러 시점에도 signin 페이지로 라우팅하고, signin 페이지가 `?error=<code>`를 해석해 "로그인을 취소했습니다. 다시 시도해 주세요" 같은 맥락 안내를 노출. 사용자가 취소한 동작이 서버 에러 화면으로 보이지 않는다. ([#334](https://github.com/idean3885/trip-planner/issues/334))
- **로그아웃 후 stale 오탐 + GCal 자동재시도 플래그 영구 잔존 수정 (#337)**: middleware의 stale 쿠키 감지 대상에서 `callback-url`을 제외하여 정상 로그아웃 흐름에서 "이전 세션이 유효하지 않아 자동으로 정리했습니다" 안내가 오탐되지 않도록 수정. 진짜 stale 신호는 `session-token`만으로 한정하고, session-token이 감지되면 PKCE/state 부수 쿠키도 함께 정리해 OAuth 재시작 꼬임은 그대로 방어. 추가로 `GCalLinkPanel`이 link/sync 성공 시 sessionStorage의 자동재시도 가드 플래그를 제거해, 한 번 consent 루프를 돌고난 뒤에도 이후 시도가 "루프 감지"로 오판되지 않도록 한다. ([#337](https://github.com/idean3885/trip-planner/issues/337))
- **여행 상세에 '일정 추가' 버튼 복원 (#339)**: Trip 생성 직후 Day가 0개인 상태에서 Day를 추가할 UI가 없어 Activity/GCal 연동 흐름 전체가 막혀 있던 UI 갭을 해소. `AddDayButton` 컴포넌트를 추가하고 여행 상세의 '일정' 섹션 헤더에 OWNER/HOST 한정으로 노출한다. date input에 Trip 범위를 `min`/`max`로 제공하되, 범위 밖 날짜 입력 시에는 서버가 Trip 범위를 자동 확장하는 기존 동작(#296)을 그대로 활용한다. ([#339](https://github.com/idean3885/trip-planner/issues/339))
- **Activity 저장 시 브라우저 IANA 타임존 자동 주입 (#341)**: `ActivityList`의 handleCreate/handleUpdate가 body에 `startTimezone`/`endTimezone`을 포함하지 않아 DB에 항상 null로 저장되어 `ActivityCard`가 KST 등 타임존 약어를 표시할 수 없었다(#325 표시 포맷 개선의 사각지대). `Intl.DateTimeFormat().resolvedOptions().timeZone`으로 감지한 브라우저 IANA 값을 startTime/endTime과 함께 전송하여 이후 표시 단계에서 약어(KST/WEST 등)가 정상 렌더되도록 한다. ([#341](https://github.com/idean3885/trip-planner/issues/341))
- **GCal scope를 `calendar.events` → `calendar` 전체로 확장해 DEDICATED 모드 복구 (#343)**: `calendars.insert`(전용 캘린더 자동 생성)는 `calendar` 또는 `calendar.app.created` scope를 요구해 기존 `calendar.events` 단독으론 403으로 실패하던 UX를 해소. Testing 모드에서는 Test users 한정 운영이라 scope 확대가 외부 악용 경로를 넓히지 않는다는 판단(유료 Production 승급 보류 유지). 기존에 `calendar.events`로 동의해 둔 사용자는 `hasCalendarScope`가 legacy 값을 여전히 유효 권한으로 인정해 즉시 재동의를 강요받지 않는다. 다만 DEDICATED를 쓰려면 재동의가 한 번 필요. ([#343](https://github.com/idean3885/trip-planner/issues/343))

### Chore

- Neon DB 환경별 분리 — Production은 `neondb`, Preview/Development는 신설한 `neondb_dev`로 분리. Vercel env 변수 `DATABASE_URL` 등 8종을 스코프별로 분기 설정. 향후 PR preview build의 `prisma migrate deploy`는 `neondb_dev`에만 적용되어 prod 영향 0 (expand-and-contract 패턴의 preview-build-timing 위험 구조적 해소). ([#318](https://github.com/idean3885/trip-planner/issues/318))


## [2.6.0] - 2026-04-20

### Added

- 공개 랜딩 페이지(`/`)를 신설하고 README·`docs/`를 외부 방문자 친화적으로 재정돈합니다. 비로그인 방문자가 프로젝트 정체성·핵심 가치·기능·기술 스택·실제 UI 미리보기·시작 CTA를 한 페이지로 훑을 수 있고, 루트 README는 독자 3층(외부 방문자·기여자·운영) 진입점으로 개편됐습니다. 기존 대시보드(여행 목록)는 `/trips`로 이관됐습니다. (#313) ([#313](https://github.com/idean3885/trip-planner/issues/313))


## [2.5.0] - 2026-04-20

### Added

- 디자인 시스템 Phase 2. 복합 컴포넌트(`ActivityCard`·`ActivityList`·`DayEditor`) 외곽과 주요 페이지(홈·여행 상세·Day 상세·`MemberList`·설정·새 여행·로그인·초대·API 문서)를 shadcn `<Card>` + `<Button>` + `<Tabs>` + semantic 토큰 기반으로 정식 전환했습니다. 레거시 커스텀 유틸리티(`rounded-card`/`shadow-card*`/`shadow-fab`/`bg-primary-*`·`bg-surface-*`/`text-surface-*`/`text-heading-*`/`text-body-*`/`max-w-content`)를 `src/**`·`styles/**`·`design/tokens.json`·`globals.css` `@theme` 블록에서 전면 제거하고, `scripts/check-legacy-utilities.sh` + `scripts/audit-tokens.ts` + CI design-system job으로 재유입을 구조적으로 차단했습니다. Day 상세에서 Prisma `Decimal` 타입이 Server → Client 경계로 그대로 넘어가 Next 16 strict 검사에 걸리던 문제를 `cost.toString()` 직렬화로 해소했습니다(#300). 브랜드 컬러·Latin 폰트 교체·다크 모드는 도입하지 않았으며, semantic 토큰은 shadcn 기본값(neutral)을 유지하여 디자이너 합류 시 `tokens.json`만으로 반영 가능한 상태로 둡니다. ([#301](https://github.com/idean3885/trip-planner/issues/301))
- About 페이지(`/about`)를 일반 사용자 관점으로 재작성. 앱 이름을 **우리의 여행**으로 통일(레포 이름 `trip-planner`는 부차 정보), 문장 톤은 합쇼체로 정합. 기술 스택 나열 섹션은 제거하고, 아키텍처·개발 가이드는 GitHub `docs/` 허브와 `ARCHITECTURE.md`로 분리해 내부 카드 링크로 연결. 유니코드 화살표(↗·→)를 lucide 아이콘(`ExternalLink`, `ArrowRight`, `BookOpen`, `Layers`)으로 교체하고, 전체 레이아웃을 shadcn `<Card>` 기반 semantic 토큰 체계에 맞춰 재구성. ([#306](https://github.com/idean3885/trip-planner/issues/306))

### Documentation

- 문서 허브(`docs/README.md`) 네비게이션을 정비. `audits/`·`evidence/`·`research/` 하위 디렉토리 색인 추가, 운영·환경(`ENVIRONMENTS.md`)·v1 역사 스펙(`spec.md`) 섹션 보강. `DEVELOPMENT.md`의 "Squash and merge" 레거시 표기를 현행 정책(`Create a merge commit`)으로 정합화. 기술 스택 표를 Tailwind v4 + shadcn vendored 기준으로 최신화. ([#307](https://github.com/idean3885/trip-planner/issues/307))


## [2.4.4] - 2026-04-19

### Fixed

- **DAY 0 노출 해소 — sortOrder 데이터 보정 + API 자동 채번**: 기존 DB의 `Day.sort_order = 0` 레코드들을 1회성 마이그레이션(`20260419140000_backfill_day_sortorder_285`)으로 각 Trip별 `date ASC` 순 1~N 재번호. POST/PUT/DELETE `/api/trips/:id/days`는 이제 `sortOrder`를 서버가 자동 관리하며 클라이언트 값은 무시. `src/lib/day-order.ts`의 `resortDaysByDate(tx, tripId)`가 transaction 내에서 전체 재정렬을 수행하여 중간 삽입·날짜 변경·삭제 후에도 DAY 1부터 순서 보장. Day.sortOrder 컬럼 폐기 등 구조적 재설계는 별도 [#296](https://github.com/idean3885/trip-planner/issues/296) (v2.5)에서 무중단으로 진행. ([#285](https://github.com/idean3885/trip-planner/issues/285))
- **활동 생성/수정/삭제 실패 시 에러 토스트 표시**: 이전엔 API 실패가 async throw로 unhandled rejection 발생(Vitest 4 + GitHub Actions reporter에서 `##[error]` 집계로 CI test step을 fail시키는 2차 피해). 이제 `ActivityList`의 3종 handler가 `try/catch`로 감싸 `sonner` 토스트(`toast.error("활동 … 에 실패했습니다")`)로 사용자에게 알리고 조용히 복귀. 테스트도 throw 기대 → toast 호출 관찰로 재설계. `.github/workflows/ci.yml`의 test step은 `continue-on-error`를 제거하여 blocking 게이트로 전환. ([#294](https://github.com/idean3885/trip-planner/issues/294))

### Chore

- **마크다운 trips fallback dead code 전면 제거**: DB가 여행 데이터 정본(#239 이후)이라 `trips/` 디렉토리는 이미 삭제된 상태였고, `src/lib/trips.ts`와 여행/일자 페이지의 `MarkdownTripPage`/`MarkdownDayPage` 분기는 실행되지 않는 dead code로 남아 있었다. 파일·분기·`gray-matter` 의존성 전체 제거. DB path의 `remark` 기반 마크다운 렌더는 유지. 페이지 라우트는 이제 `isNaN(id)` 시 `notFound()`로만 처리. ([#269](https://github.com/idean3885/trip-planner/issues/269))
- **speckit tasks.md artifact 태그 포스트 릴리즈 정합성 개선**: v2.4.3 릴리즈 시 towncrier가 `changes/*.md` 단편을 `CHANGELOG.md`로 합산·삭제한 뒤 drift validator가 "체크됐으나 artifact 부재" 에러를 냄. T035의 `[artifact]` 태그를 `CHANGELOG.md::v2.4.3`으로 갱신해 릴리즈 후에도 drift audit 통과. ([#270](https://github.com/idean3885/trip-planner/issues/270))
- **Coverage threshold 100/95 복원 + CI blocking 전환**: develop baseline(Lines 99.09% / Branches 91.2% / Statements 99.09%) 대비 12건의 신규·보강 테스트 추가(POST/PUT/DELETE 분기 조합, ActivityList 네트워크 reject 토스트, 다수 activity 중 단일 업데이트, 비용 parseFloat truthy 분기 등). UI에서 렌더된 activity id만 `handleMove`에 전달되고 `ActivityCard.isFirst/isLast`가 경계 버튼을 숨기는 등 도달 불가능한 방어 경로 2건은 `c8 ignore` 주석으로 근거 명시. 최종 커버리지 Lines/Statements/Functions 100% · Branches 96.51%. `.github/workflows/ci.yml`의 `test:coverage` step은 `continue-on-error` 제거하여 blocking 게이트로 전환, 앞으로 threshold 미달 PR은 CI 차단. ([#282](https://github.com/idean3885/trip-planner/issues/282))
- **CI에 lint/typecheck/test 게이트 추가**: `.github/workflows/ci.yml` 신설. PR과 develop push 단계에서 `npm run lint`(blocking) / `npx tsc --noEmit`(blocking)는 즉시 차단 게이트로, `npm test`와 `npm run test:coverage`는 기존 tech debt(각각 #294 unhandled rejection, #282 coverage threshold) 때문에 우선 non-blocking(`continue-on-error`)으로 둔다. 해당 추적 이슈 해결 후 차례대로 blocking 전환. Node 20 matrix. 이전에 누적된 baseline lint error(`tailwind.config.ts` `require()`)는 v2.4.3 shadcn 도입으로 config 파일 자체가 사라지면서 자연 해소됨. ([#286](https://github.com/idean3885/trip-planner/issues/286))


## [2.4.3] - 2026-04-19

### Added

- **디자인 시스템 기반(shadcn/ui) + 폼 마이그레이션 + 디자이너 핸드오프 파이프라인**: `src/components/ui/`에 shadcn 12종(button·input·label·field·card·dialog·dropdown-menu·select·separator·skeleton·sonner·tabs) vendoring, 기존 폼 6종(ActivityForm·AuthButton·DeleteTripButton·LeaveTripButton·InviteButton·TodayButton)을 shadcn 기반으로 마이그레이션. `window.confirm` → `Dialog`, `alert()` → `toast` 전환으로 접근성·포커스 트랩·상태 일관성 확보. 서버 API fetch·props 시그니처 1:1 보존(헌법 V). 라이트 단독(shadcn `.dark` 블록 제거, `@custom-variant dark`만 남겨 런타임 inert). 디자이너 핸드오프 파이프라인: `design/tokens.json`(W3C DTCG) + `scripts/build-tokens.ts`(자체 flatten, 멱등) + `npm run tokens:build` + GitHub Issue Forms 템플릿 `🎨 Designer Handoff`(필수 필드 6종). 개발 전용 컴포넌트 카탈로그 `/components` 신설(`(dev)` route group + 프로덕션 `notFound()`). 신규 의존성: `@base-ui/react`, `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tw-animate-css`, `sonner`. ([#270](https://github.com/idean3885/trip-planner/issues/270))

### Documentation

- **업무 프로세스 단일 정본 도입**: `docs/WORKFLOW.md`(팀 구성·이슈 흐름·릴리즈·디자이너 협업·AI 에이전트·마일스톤·핫픽스 7 섹션) + `docs/design-handoff.md`(디자이너 핸드오프 상세 절차) 신설. `docs/README.md`·`CLAUDE.md`·루트 `README.md`에서 1홉 진입 링크 추가. CLAUDE.md는 AI 에이전트 1차 컨텍스트로 역할 축소하고 WORKFLOW.md에 권위 위임. v2.4.3 디자인 시스템 기반(#270) 마일스톤의 PR5(업무 프로세스 문서) 몫. ([#270](https://github.com/idean3885/trip-planner/issues/270))

### Chore

- **Tailwind CSS v3 → v4 CSS-first 전환**: `@tailwind` 3지시어를 `@import "tailwindcss"` + `@theme` 블록으로 교체. `tailwind.config.ts` 삭제, PostCSS 플러그인을 `@tailwindcss/postcss` 단일 구성으로 단순화(autoprefixer 내장). 기존 색상 팔레트·그림자·반경 토큰을 CSS 변수로 1:1 포팅. `.prose` 계열 규칙과 `@apply` 사용처는 그대로 유지. Next 16 빌드에서 tsconfig.json의 `jsx: preserve → react-jsx` 자동 재구성 결과 반영. ([#250](https://github.com/idean3885/trip-planner/issues/250))
- **speckit hook worktree-aware 개선**: `.specify/scripts/bash/enforce-submit.sh`와 `clear-submit-mark.sh`가 이제 `cd <path> && git commit` 형태의 bash command에서 `cd` 타깃을 추출해 해당 worktree에서 git 판정을 수행한다. 이전엔 hook 실행 cwd(=main worktree)만 기준이라 main worktree가 feature 브랜치 상태면 다른 worktree의 commit까지 차단되던 버그 해소. CLAUDE.md "워크트리 분기 + AI 병렬" 전제가 실제로 작동. ([#287](https://github.com/idean3885/trip-planner/issues/287)) ([#287](https://github.com/idean3885/trip-planner/issues/287))


## [2.4.2] - 2026-04-19

### Chore

- **Next.js 15 → 16 업그레이드**: 프레임워크 메이저 버전업. 현재 프로젝트가 App Router 기본 패턴만 사용하여 breaking change 대응 코드 변경 없음. `next-auth@5.0.0-beta.31` peer(`next: ^14 || ^15 || ^16`)와 호환. `npx tsc --noEmit`·테스트 152개 전부 통과. `dependabot.yml` next ignore 블록 제거. **런타임 검증은 Vercel Preview 빌드 결과로 확인 필요**. ([#249](https://github.com/idean3885/trip-planner/issues/249))
- **TypeScript 5.9 → 6.0 업그레이드**: 컴파일러 메이저 버전업. TS 6의 엄격한 side-effect import 검사(TS2882)에 대응해 `src/types/assets.d.ts`를 추가하여 `*.css` 임포트 선언 제공. 타입체크·테스트 전부 통과, `@typescript-eslint/*`와도 peer 호환(`<6.1.0`). `dependabot.yml` typescript ignore 블록 제거. ([#251](https://github.com/idean3885/trip-planner/issues/251))
- **Vitest 3 → 4 업그레이드**: 테스트 러너와 `@vitest/coverage-v8` 메이저 버전 동반 업그레이드. 기존 테스트 152개 전부 통과, 기능 회귀 없음. `dependabot.yml` vitest ignore 블록 제거. ([#252](https://github.com/idean3885/trip-planner/issues/252))


## [2.4.1] - 2026-04-19

### Chore

- **towncrier 도입으로 CHANGELOG 충돌 해소**: PR마다 `changes/<이슈>.<타입>.md` 단편 파일 1개를 추가하고, 릴리즈 PR에서 `towncrier build`로 자동 집계해 `CHANGELOG.md`에 합친다. 단일 파일 동시 편집 충돌이 구조적으로 차단되어 워크트리 분기 + AI 보조 병렬 작업이 안전해진다. 기존 `auto-tag.yml` / `auto-release.yml` / `pypi-publish.yml` 자동화 체인은 그대로 유지. ([#272](https://github.com/idean3885/trip-planner/issues/272))


## [2.4.0] - 2026-04-19

### Added
- **프로젝트 아이덴티티 표면 구축**: 앱을 공유받은 방문자가 프로젝트 출처·API 접근 경로를 즉시 파악할 수 있도록 3종 표면 추가. (#200)
  - **전역 풋터** — 모든 페이지 하단에 `Made by idean3885`, `GitHub ↗`, `About`, `API Docs ↗` 노출. flex-wrap 단일 레이아웃(브레이크포인트 분기 없음), sticky footer(짧은 콘텐츠 페이지에서도 뷰포트 하단 고정).
  - **About 페이지** — `/about` 공개 라우트 신설. 프로젝트 배경·저작자·라이선스·기술 스택 요약 표시. 로그인 없이 접근 가능.
  - **설정 페이지 API 문서 진입점** — 설정 페이지 제목 옆에 "API 문서 →" 링크 추가.
  - **단일 메타 소스** — `src/lib/project-meta.ts`에 `ProjectMeta` 타입과 `projectMeta` 상수를 `as const satisfies`로 정의. 풋터·About 모두 동일 소스 참조로 drift 구조적 방지.
  - **공개 라우트 확장** — 미들웨어에 `/about`과 `/docs`를 공개 경로로 추가. 비로그인 방문자도 프로젝트 정체성·API 문서에 도달 가능.
  - 신규 npm 의존성 0건(아이콘은 유니코드 `↗` 인라인).

## [2.3.4] - 2026-04-19

### Fixed
- **speckit `create-new-feature.sh` 워크트리 분기 충돌**: 호출자(devex:flow 등)가 `NNN-*` 브랜치를 선행 생성한 상태에서 `/speckit.specify` 호출 시 스크립트가 `git checkout -b`를 다시 시도하며 충돌. 현재 브랜치가 `NNN-<suffix>` 패턴이고 `specs/<branch>/`가 아직 없으면 해당 브랜치를 재사용하도록 감지 블록 추가. 동시에 `git branch -a` 파싱 시 워크트리 체크아웃 마커(`+`)를 sed 필터에 반영하여 타 워크트리에서 체크아웃된 브랜치가 자동 채번에서 누락되던 부수 버그도 수정.

## [2.3.3] - 2026-04-19

### Changed
- **dependabot 플로우 정규화**: `target-branch: develop` 추가(npm, pip, github-actions). dependabot PR이 기본값으로 `main`을 타겟하면서 Git Flow Lite(feature/hotfix → develop PR) 정책을 우회하던 문제 해소. (#258)

### Chore (deps)
- **GitHub Actions**: `actions/checkout` 4 → 6, `astral-sh/setup-uv` 업데이트. (#245)
- **npm**: `postcss` 8.5.9 → 8.5.10, `eslint-config-next` 업데이트. (#246)

## [2.3.2] - 2026-04-19

### Fixed
- **Hotfix: Day 상세 페이지 500 (DYNAMIC_SERVER_USAGE)**: v2.3.1의 `trips/` 디렉토리 제거(#239)로 `generateStaticParams`가 빈 배열을 반환하면서, `auth()`를 호출하는 동일 페이지가 Next.js의 SSG 플래그와 충돌해 런타임 500이 발생. `src/app/trips/[id]/page.tsx`, `src/app/trips/[id]/day/[dayId]/page.tsx`, `src/app/day/[num]/page.tsx`에서 `generateStaticParams` 제거 + `export const dynamic = "force-dynamic"` 명시로 세션 기반 동적 렌더 고정. 레거시 `/day/[num]`는 홈으로 리다이렉트.

## [2.3.1] - 2026-04-18

### Fixed
- **Activity 시각 저장 IANA timezone 무시**: `toTimestamp`가 `setUTCHours`로 HH:mm을 UTC 가정하여 기록하고 프론트는 `getUTCHours()`로 표시해 "floating-time" 관행이 되어 있었다. `src/lib/activity-time.ts` 공통 유틸로 HH:mm + dayDate + IANA timezone → 실제 UTC 변환(DST 경계 보정 포함), 표시는 `Intl.DateTimeFormat({ timeZone })` 기반으로 수정. 기존 데이터는 `data-migration` SQL로 `AT TIME ZONE` 연산 재계산. (#232)
- **여행 상세 일정 목록 정렬**: Day 목록이 `sortOrder` 기준으로 정렬되어 늦게 추가된 Day(예: 귀국일 `sortOrder=0`)가 최상단에 노출. 정렬 키를 `date ASC`로 변경. DAY 라벨(번호)은 표시용으로만 유지. (#238)

### Removed
- **레거시 마크다운 트립 데이터 및 관련 스크립트·템플릿**: v2.0.0 AX 방향 이후 DB가 단일 정본이 되어 `trips/*.md` 마크다운은 drift 원인이 된 이중장부. 구 일정 마크다운 vs 신 일정 DB 불일치 확인. `trips/2026-honeymoon-portugal-spain/`, `templates/`, `scripts/` 레거시 5개(`generate-pdf.sh`, `parse-daily-to-events.py`, `validate-daily.py`, `validate-budget.py`, `migrate-markdown.ts`) 제거. CLAUDE.md는 DB 정본 기반으로 재작성. (#239)

## [2.3.0] - 2026-04-17

### Added
- **speckit 하네스 도입**: 이슈 #181 + 12개 하위 이슈(#205~#216). 스펙 산출물 간 정합성 자동 검증으로 #191 유형(plan 항목 tasks 미매핑 → 데이터 마이그레이션 누락)의 재발을 구조적으로 차단.
  - 4종 메타태그(`[artifact]`, `[why]`, `[multi-step]`, `[migration-type]`)를 검증 근간으로 고정
  - 검증기 7종 + CI 워크플로우 2종 추가: `validate-metatag-format.sh`, `validate-plan-tasks-cov.sh`, `validate-drift.sh`, `validate-quickstart-ev.sh`, `validate-migration-meta.sh`, `validate-constitution.sh`, `merge-tasks-to-issues.sh` + `speckit-gate.yml`, `drift-audit.yml`
  - 신규 템플릿 2종(`implement-template.md`, `quickstart-template.md`) + 기존 템플릿(`spec-template.md`, `plan-template.md`, `tasks-template.md`) 메타태그 가이드 추가
  - 기존 `enforce-speckit.sh`의 `-maxdepth 1` 버그 수정(카테고리 하위 구조 탐색 정상화)
  - **3단계 롤아웃 완료**: `expand` → `migrate` → `contract`. 현재 `contract` 모드에서 speckit-gate CI가 실제 차단 역할 수행.
  - **migration-type 사이드카 방식**: `prisma/migrations/<dir>/migration-type` 파일로 레거시 마이그레이션을 Prisma checksum 손상 없이 분류 (10개 소급 적용).

### Changed
- **PR 머지 정책**: 전 방향 `Create a merge commit` 고정(#218). Squash and merge off.
- **CLAUDE.md**: "작업 규칙"에 speckit 하네스 메타태그·검증기·rollout phase 섹션 추가

## [2.2.7] - 2026-04-17

### Changed
- **URL 도출 전략 재설계**: 환경별 외부 env(AUTH_URL 등) 의존 제거. `src/lib/app-url.ts` 헬퍼 + Auth.js `trustHost: true`로 각 환경이 자기 요청 origin만 보고 동작. "dev가 prod 참조, local이 dev 참조" 교차 참조를 구조적으로 차단. 문서: `docs/ENVIRONMENTS.md`. (#194)
- **설정 페이지 PAT 발급 UX 재정비**: 자동 발급(install.sh)을 기본 시각으로 설명하고 수동 발급 폼은 `<details>` 접힘 "수동 발급 (고급)" 영역으로 이동. 설치 가이드·API 문서 링크 추가. 웹 전용 유저도 self-serve 가능하게 유지. `POST /api/tokens` deprecated 표기 해제(공식 경로로 유지). (#199, 디스커션 #187 후속)

### Added
- **여행 멤버 목록 UI**: 여행 상세 페이지에 동행자 섹션 추가 — 아바타/이름/역할 배지(주인·호스트·게스트). OWNER → HOST → GUEST 순 정렬 후 joined_at 오름차순. (#193, 디스커션 #186)

### Fixed
- **여행 삭제/양도 전면 불가 상태 복구**: `POST /api/trips`가 생성자를 `HOST`로 기록해 OWNER가 존재하지 않던 문제 수정. 생성자는 이제 OWNER로 등록되며, 기존 여행은 마이그레이션으로 `tripMember.userId == trip.createdBy` 조건에서 OWNER로 승격됨. 홈 목록의 "호스트" 표시도 정상적으로 "내 여행"으로 복구됨. (#191, 디스커션 #188)
- **여행 삭제 UI 노출**: 여행 상세 페이지에 OWNER 전용 "여행 삭제" 버튼 추가. 확인 다이얼로그 포함. (#191)
- **여행 나가기 UI 노출**: HOST/GUEST 대상 "여행 나가기" 버튼 추가 — 초대 → 합류 → 나가기 플로우 완결. OWNER는 양도 후 탈퇴 필요 (API가 차단). (#191)
- **초대 링크 상대경로 생성**: dev 환경에서 invite URL이 `/invite/...` 상대경로로 생성되어 외부 앱 붙여넣기 시 `file://`로 해석되던 문제 수정. 위 URL 도출 재설계로 재발 불가. (#194, 디스커션 #185 Case 1 실제 원인)

## [2.2.6] - 2026-04-17

### Fixed
- **초대 링크 비로그인 플로우**: 비로그인 유저가 `/invite/{token}` 접근 시 middleware가 `callbackUrl`을 보존하지 않아 로그인 후 홈으로 이탈하던 문제 수정. 이제 로그인 완료 후 원래 초대 링크로 복귀하여 TripMember가 정상 생성됨. (#189, 디스커션 #185)

## [2.2.5] - 2026-04-17

### Fixed
- **Activity 시간 필드**: VarChar → Timestamptz 전환, 프로덕션 DB 정합성 수습 (#178)
- **auto-release**: CHANGELOG 특수문자 셸 확장 오류 수정 (--notes-file 방식)

### Added
- **IANA timezone 컬럼**: start_timezone, end_timezone으로 시간대 표시 지원 (#178)
- **docs/ARCHITECTURE.md**: 시스템 구조, 인증 흐름, 도메인 결합도 문서
- **docs/DOMAIN.md**: DDD 기술 도메인, 애그리거트, 이벤트 설계
- **docs/ERD.md**: 전체 DB 스키마 Mermaid ERD + 컬럼 코멘트
- **docs/README.md**: 기술 문서 허브 (포트폴리오/개발자용)
- **specs/README.md**: 기획 도메인 5개 정의 + 크로스 도메인 규칙
- **헌법 v1.2.0**: Cross-Domain Integrity(V) + Role-Based Access Control(VI) 원칙 추가

### Changed
- **specs/ 재구성**: 기획 도메인 기준 디렉토리 (travel-search, itinerary, collaboration, export)
- **기획/기술 영역 분리**: specs/ = 기획 원천, docs/ = 기술 원천, 헌법 = 원칙 원천

## [2.2.4] - 2026-04-16

### Fixed
- **MCP memo 줄바꿈**: CLI에서 `\n` 리터럴이 그대로 저장되던 문제 수정 (#169)
- **예약상태 라벨**: "불필요" → "예약 불필요"로 문구 보완 (#169)

### Changed
- **시간대 표기 지원**: Activity startTime/endTime VarChar(5→12) 확장, `13:00 KST` 형식 가능 (#169)
- **vitest SWC 전환**: `@vitejs/plugin-react` → `@vitejs/plugin-react-swc` (transform 12% 개선) (#170)
- **vitest vmThreads**: `pool: "vmThreads"` 적용으로 environment 18% 개선 (#170)

## [2.2.3] - 2026-04-16

### Fixed
- **PR 머지 전략**: develop → main은 merge commit 필수 (squash 시 역머지 충돌 문제 해결)

### Changed
- **CLAUDE.md + DEVELOPMENT.md**: PR 머지 전략 테이블 추가 (squash vs merge commit 사용 구분)

## [2.2.2] - 2026-04-16

### Fixed
- **핫픽스 프로세스**: main 직접 머지 금지, develop 경유 필수로 규칙 정립
- **speckit 하네스**: develop 브랜치 소스 편집 차단 추가 (enforce-speckit.sh, enforce-submit.sh)

### Changed
- **CLAUDE.md**: 핫픽스 규칙 + 브랜치 다이어그램에 hotfix 반영
- **docs/DEVELOPMENT.md**: 핫픽스 프로세스 섹션 추가

## [2.2.1] - 2026-04-16

### Fixed
- **PyPI 배포 실패**: rapidapi 테스트에서 삭제된 `get_client` 함수를 참조하던 테스트 수정

## [2.2.0] - 2026-04-16

### Added
- **OAuth CLI 인증**: install.sh에서 브라우저 Google 로그인 1회로 PAT 자동 발급·저장 (#128)
- **MCP 런타임 재인증**: 토큰 만료(401) 시 브라우저 자동 재인증 + 요청 재시도 (#129)
- **PAT 미설정 초기 인증**: MCP 첫 호출 시 토큰 없어도 브라우저 인증으로 자동 발급
- **auto-release.yml**: 태그 push 시 CHANGELOG 기반 GitHub Release 자동 생성
- **Git Flow Lite 전략**: main(production) + develop(dev) + feature 브랜치 전략 도입 (#148)
- **dev.trip.idean.me**: develop 브랜치 전용 알파 배포 도메인

### Changed
- **auto-tag.yml**: lightweight → annotated 태그 전환
- **install.sh**: 수동 PAT 입력 → 브라우저 OAuth 우선 (수동은 폴백)
- **token-helpers.ts**: createPAT 공유 헬퍼 추출, /api/tokens 리팩터
- **web_client.py**: asyncio.Lock 기반 동시 재인증 방지, 키체인 자동 갱신

## [2.1.0] - 2026-04-16

### Added
- **Activity 데이터 모델**: ActivityCategory/ReservationStatus enum + Activity 테이블 (#124)
- **Activity CRUD API**: GET/POST/PATCH/PUT/DELETE 엔드포인트 5개 (#127)
- **MCP 도구 확장**: create/update/delete/reorder_activity, get_day_content, clear_day_content — 14→20개 (#127, #134)
- **ActivityCard 컴포넌트**: 카테고리/시간/장소/비용/예약상태 카드 뷰 (#127)
- **ActivityForm 컴포넌트**: 구조화 입력 폼, 현지 시각 자동 세팅, 필수 필드 표시 (#125)
- **ActivityList 컴포넌트**: CRUD + 순서 변경(▲▼) 클라이언트 상태 관리 (#125)
- **memo URL 자동 링크**: 메모 내 URL을 클릭 가능한 링크로 렌더링 (새 창) (#125)
- **마크다운 변환 지원**: get_day_content + clear_day_content MCP 도구, 변환 안내 배너 (#134)
- **테스트 인프라**: Vitest + React Testing Library + Playwright E2E — 61케이스 (#141)
- **alpha 환경**: alpha.trip.idean.me 프리뷰 도메인 구성 (#127)
- **OpenAPI v2.1.0**: Activity 스키마 + 5개 엔드포인트 문서화 (#127)
- **GET /days/{dayId} API**: 단일 일자 상세 조회 (활동 포함) (#134)

### Changed
- **일자 상세 페이지**: DayEditor 제거 → ActivityList + 읽기 전용 메모 (#125)
- **get_trip MCP**: 일자별 활동 수 표시 (#127)

### Fixed
- **라우트 충돌**: `[id]`/`[slug]` 동적 라우트 통합 — dev 서버 크래시 해소 (#127)
- **인증 리다이렉트**: 로그인 상태에서 /auth/signin 접근 시 홈으로 (#127)
- **AUTH_URL Preview 스코프**: 프리뷰 배포 인증 정상화 (#127)

## [2.0.1] - 2026-04-14

### Fixed
- PAT 인증 수정 + UI 개선

## [2.0.0] - 2026-04-14

### Added
- Next.js 15 웹앱 (App Router, SSR)
- Auth.js v5 Google OAuth + PAT 인증
- Neon Postgres + Prisma 7
- MCP 14개 도구 (검색 8 + CRUD 6)
- OpenAPI 3.0 + Scalar 문서 뷰어
- 여행/일자/멤버 CRUD API
- 초대 링크 (JWT) + 소유권 이전
- macOS 키체인 통합 설치 스크립트
