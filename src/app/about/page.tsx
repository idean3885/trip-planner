import { ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { projectMeta } from "@/lib/project-meta";

export const metadata: Metadata = {
  title: `소개 — ${projectMeta.name}`,
  description: projectMeta.description,
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <nav className="text-muted-foreground flex items-center gap-2 text-sm">
          <Link href="/" className="hover:text-foreground">
            홈
          </Link>
          <span aria-hidden>·</span>
          <span className="text-foreground">소개</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">
          {projectMeta.name}
        </h1>
        <p className="text-foreground text-base leading-relaxed">
          {projectMeta.tagline}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          이렇게 쓰게 됩니다
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          여행 주인이 &quot;이번 주말 제주 2박 3일, 바다가 보이는
          숙소로&quot;처럼 말을 건네면 일정이 자동으로 짜입니다. 초대받은
          동행자는 웹에서 바로 일정을 열어보고, 가고 싶은 곳을 덧붙이거나 시간을
          조정합니다. 모든 변경은 즉시 서로에게 공유되어 따로 정리할 필요가
          없습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          AI 에이전트로도 쓸 수 있어요
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Claude 같은 AI에게 말로 일정을 맡기고 싶다면, 맥북에서 아래 한 줄로
          연결합니다. 설치 중 브라우저가 열리면 Google 로그인만 하면 되고, 토큰은
          자동으로 저장됩니다. 이후 &quot;3일차 오전에 벨렘탑 넣어줘&quot;처럼
          자연어로 요청하면 됩니다.
        </p>
        <pre className="bg-muted/40 overflow-x-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed whitespace-pre">
          <code>{`curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash`}</code>
        </pre>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <a
            href={`${projectMeta.githubUrl}/blob/main/mcp/README.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            설치·사용 상세
            <ExternalLink className="size-3" aria-hidden />
          </a>{" "}
          — 서버처럼 브라우저를 열 수 없는 환경의 연결 방법, 그리고 개발자용
          토큰을 직접 발급하는 방법(
          <Link
            href="/settings"
            className="text-foreground underline-offset-4 hover:underline"
          >
            설정
          </Link>
          )도 여기에 정리돼 있습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">정보</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">저작자</dt>
          <dd className="text-foreground">{projectMeta.author}</dd>

          <dt className="text-muted-foreground">라이선스</dt>
          <dd className="text-foreground">{projectMeta.license}</dd>

          <dt className="text-muted-foreground">저장소</dt>
          <dd>
            <a
              href={projectMeta.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {projectMeta.repoName}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </dd>

          <dt className="text-muted-foreground">기술 구조</dt>
          <dd>
            <a
              href={projectMeta.architectureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              ARCHITECTURE.md
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </dd>

          <dt className="text-muted-foreground">API 문서</dt>
          <dd>
            <Link
              href="/docs"
              className="text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              앱 안에서 열기
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </dd>
        </dl>
      </section>
    </article>
  );
}
