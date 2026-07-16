export type FeatureHighlight = {
  readonly image: string;
  readonly title: string;
  readonly summary: string;
  readonly bullets: readonly string[];
};

/**
 * 대문 소개 섹션의 단일 정본. 이전에는 "이런 걸 할 수 있어요"(혜택)와
 * "할 수 있는 것"(기능)이 나뉘어 같은 취지를 두 번 말했다. 혜택 헤드라인 톤과
 * 구체 불릿을 한 카드로 합쳐 4개 카드로 통합했다(spec 064).
 */
export const landingFeatures: readonly FeatureHighlight[] = [
  {
    image: "/landing/features/plan.png",
    title: "대화로 계획합니다",
    summary:
      'AI에게 "바르셀로나 6월 4박"이라고 말하면 숙소·항공·활동을 대신 찾아 일정에 꽂아 넣습니다.',
    bullets: [
      "숙소·항공·관광지 검색",
      "일자·활동 자동 생성·순서 변경",
      "Claude에 한 줄로 연결 · 로그인만으로 시작",
    ],
  },
  {
    image: "/landing/features/manage.png",
    title: "웹에서 직접 관리하고 함께 다듬습니다",
    summary:
      "여행 → 날짜 → 활동 3계층으로 직접 추가·정리하고, 동행자와 역할별 권한으로 협업합니다.",
    bullets: [
      "여행 → 날짜 → 활동 3계층 직접 관리",
      "동행자 초대와 역할별 권한 (주인·호스트·게스트)",
      "웹·모바일 어디서나 같은 화면",
    ],
  },
  {
    image: "/landing/features/mobile.png",
    title: "모바일에서 현장까지 이어집니다",
    summary:
      "여행 중 스마트폰에서 오늘의 일정과 다음 이동을 확인하고, 여행 캘린더와도 이어집니다.",
    bullets: [
      "여행지 현지 시간으로 일정 표시",
      "오늘의 일정과 다음 이동 확인",
      "Apple 여행 캘린더 연동",
    ],
  },
  {
    image: "/landing/features/expense.png",
    title: "현장에선 가계부가 됩니다",
    summary: "예약·현장 지출을 통화별로 적어 두면 여행 경비가 한눈에 모입니다.",
    bullets: ["사전/현장 지출 구분", "통화별 금액 합산", "예약·티켓 지출 기록"],
  },
] as const;
