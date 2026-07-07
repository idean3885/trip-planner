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
  tagline: "같이 갈 사람과 대화로 계획하고, 함께 완성해 가는 여행.",
  description:
    "같이 갈 사람과 대화로 계획하고, 함께 완성해 가는 여행. 일정·숙소·활동을 한곳에 모아 모바일에서 바로 확인합니다.",
} as const satisfies ProjectMeta;
