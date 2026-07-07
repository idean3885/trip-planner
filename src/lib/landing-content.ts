import type { LucideIcon } from "lucide-react";
import {
  Bot,
  MapPin,
  MessageSquareText,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

export type ValueProp = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
};

export type FeatureHighlight = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly summary: string;
  readonly bullets: readonly string[];
};

export const landingValues: readonly ValueProp[] = [
  {
    icon: Sparkles,
    title: "대화로 계획합니다",
    description:
      'AI에게 "바르셀로나 6월 4박"이라고 말하면 숙소·항공·활동을 대신 찾아 일정에 꽂아 넣습니다.',
  },
  {
    icon: Users,
    title: "동행자와 함께 다듬습니다",
    description:
      "초대 링크 한 장으로 호스트·게스트를 붙여 역할별 권한으로 협업합니다.",
  },
  {
    icon: Smartphone,
    title: "모바일에서 바로 꺼내 씁니다",
    description:
      "여행 중 스마트폰에서 바로 열어 오늘의 일정과 다음 이동을 확인합니다.",
  },
  {
    icon: Wallet,
    title: "현장에선 가계부가 됩니다",
    description:
      "예약·현장 지출을 통화별로 적어 두면 여행 경비가 한눈에 모입니다.",
  },
] as const;

export const landingFeatures: readonly FeatureHighlight[] = [
  {
    icon: MessageSquareText,
    title: "웹에서 일정·활동을 직접 관리",
    summary:
      "여행 → 날짜 → 활동 3계층으로 드래그·순서 변경·카탈로그 검색을 모바일에서도 편하게.",
    bullets: [
      "여행 → 날짜 → 활동을 직접 추가·정리",
      "동행자 초대와 역할별 권한 (주인·호스트·게스트)",
      "웹·모바일 어디서나 같은 화면",
    ],
  },
  {
    icon: Bot,
    title: "AI 에이전트가 대신 찾고 꽂아줍니다",
    summary:
      "Claude Desktop·Claude Code에서 MCP(Model Context Protocol) 도구 20종을 호출해 일정을 자동 편성합니다.",
    bullets: [
      "숙소·항공·관광지 검색",
      "일자·활동 자동 생성·순서 변경",
      "한 줄 설치 · Google 로그인만으로 완료",
    ],
  },
  {
    icon: MapPin,
    title: "실제 사용 데이터와 연동됩니다",
    summary:
      "Apple iCloud 여행 캘린더, 구글맵 링크, 호텔 예약 페이지까지 모바일에서 한 번에 이어집니다.",
    bullets: [
      "여행지 현지 시간으로 일정 표시",
      "사전/현장 지출 구분 + 통화별 금액 합산",
      "Apple 여행 캘린더 연동",
    ],
  },
] as const;
