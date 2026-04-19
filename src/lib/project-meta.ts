export type ProjectMeta = {
  readonly name: string;
  readonly repoName: string;
  readonly author: string;
  readonly githubUrl: string;
  readonly docsUrl: string;
  readonly architectureUrl: string;
  readonly license: string;
  readonly tagline: string;
  readonly description: string;
};

export const projectMeta = {
  name: "우리의 여행",
  repoName: "trip-planner",
  author: "idean3885",
  githubUrl: "https://github.com/idean3885/trip-planner",
  docsUrl: "https://github.com/idean3885/trip-planner/tree/main/docs",
  architectureUrl:
    "https://github.com/idean3885/trip-planner/blob/main/docs/ARCHITECTURE.md",
  license: "MIT",
  tagline:
    "여행 계획을 대화로 만들고 동행자와 함께 다듬는 플래너입니다. 일정·숙소·활동을 한곳에 모아 두고, 모바일에서 바로 열어 씁니다.",
  description:
    "여행 계획을 대화로 만들고 동행자와 함께 다듬는 플래너. 일정·숙소·활동을 한곳에 모아 모바일에서 바로 확인합니다.",
} as const satisfies ProjectMeta;
