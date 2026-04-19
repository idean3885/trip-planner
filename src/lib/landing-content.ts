import type {
  LucideIcon,
} from "lucide-react";
import {
  Sparkles,
  Users,
  Smartphone,
  Layers,
  MessageSquareText,
  Bot,
  MapPin,
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

export type TechStackCategory = {
  readonly label: string;
  readonly items: readonly string[];
};

export const landingValues: readonly ValueProp[] = [
  {
    icon: Sparkles,
    title: "대화로 계획합니다",
    description:
      "AI에게 \"바르셀로나 6월 4박\"이라고 말하면 숙소·항공·활동을 대신 찾아 일정에 꽂아 넣습니다.",
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
    icon: Layers,
    title: "풀스택 1인 프로젝트입니다",
    description:
      "Next.js 웹앱부터 Python MCP 서버, Postgres, CI/CD까지 한 레포에서 직접 운영합니다.",
  },
] as const;

export const landingFeatures: readonly FeatureHighlight[] = [
  {
    icon: MessageSquareText,
    title: "웹에서 일정·활동을 직접 관리",
    summary:
      "여행 → 날짜 → 활동 3계층으로 드래그·순서 변경·카탈로그 검색을 모바일에서도 편하게.",
    bullets: [
      "여행·일자·활동 CRUD",
      "동행자 초대와 역할 기반 권한 (OWNER/HOST/GUEST)",
      "shadcn/ui 디자인 시스템 기반 반응형 UI",
    ],
  },
  {
    icon: Bot,
    title: "AI 에이전트가 대신 찾고 꽂아줍니다",
    summary:
      "Claude Desktop·Claude Code에서 MCP(Model Context Protocol) 도구 20종을 호출해 일정을 자동 편성합니다.",
    bullets: [
      "숙소·항공·관광지 검색 (RapidAPI 기반)",
      "일자·활동 자동 생성·순서 변경",
      "1줄 curl로 설치 · Google 로그인만으로 완료",
    ],
  },
  {
    icon: MapPin,
    title: "실제 사용 데이터와 연동됩니다",
    summary:
      "Apple iCloud 여행 캘린더, 구글맵 링크, 호텔 예약 페이지까지 모바일에서 한 번에 이어집니다.",
    bullets: [
      "Timestamptz + IANA 타임존 분리 저장",
      "예약 상태 4단계 (필수/권장/현장/불요)",
      "Neon Postgres 위에서 Prisma 스키마로 관리",
    ],
  },
] as const;

export const landingTechStack: readonly TechStackCategory[] = [
  {
    label: "프론트엔드 & UI",
    items: [
      "Next.js 16 (App Router · Turbopack)",
      "React 19",
      "TypeScript 5.x",
      "Tailwind CSS v4",
      "shadcn/ui",
      "Radix UI",
    ],
  },
  {
    label: "백엔드 & 데이터",
    items: [
      "Next.js Server Components",
      "Prisma 7.x",
      "Neon Postgres",
      "Auth.js v5",
    ],
  },
  {
    label: "AI 통합",
    items: [
      "Python 3.14 + FastMCP",
      "Claude Desktop · Claude Code",
      "MCP 도구 20종",
    ],
  },
  {
    label: "인프라 & 운영",
    items: [
      "Vercel",
      "GitHub Actions",
      "towncrier · speckit 하네스",
      "Playwright · Vitest",
    ],
  },
] as const;
