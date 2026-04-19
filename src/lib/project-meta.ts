export type ProjectMeta = {
  readonly name: string;
  readonly author: string;
  readonly githubUrl: string;
  readonly license: string;
  readonly description: string;
  readonly techStack: readonly string[];
};

export const projectMeta = {
  name: "Trip Planner",
  author: "idean3885",
  githubUrl: "https://github.com/idean3885/trip-planner",
  license: "MIT",
  description:
    "AI 기반 여행 계획 및 동행 협업 플래너. Claude Code·MCP 서버와 Next.js 웹앱을 통합해 일정·숙소·항공편을 자연어로 편성한다.",
  techStack: [
    "Next.js 15 (App Router)",
    "TypeScript",
    "Prisma + Neon Postgres",
    "Auth.js v5",
    "Tailwind CSS",
    "MCP (Python / FastMCP)",
  ],
} as const satisfies ProjectMeta;
