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
        <h2 className="text-base font-semibold tracking-tight">왜 만들었나</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          여행 주인이 &quot;이번 주말 제주 2박 3일, 바다가 보이는
          숙소로&quot;처럼 말을 건네면 일정이 자동으로 짜입니다. 동행자는 웹에서
          바로 일정을 열어 덧붙이고, 변경은 즉시 서로에게 공유됩니다. 계획을
          주고받는 번거로움을 덜려고 개인적으로 만든 여행 플래너입니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          AI 에이전트로도 쓸 수 있어요
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Claude 같은 AI에게 말로 일정을 맡길 수 있습니다. 설치·연결 방법과
          개발자용 토큰 발급은{" "}
          <a
            href={`${projectMeta.githubUrl}/blob/main/mcp/README.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            설치·사용 안내
            <ExternalLink className="size-3" aria-hidden />
          </a>
          에 정리돼 있습니다.
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
            {/* Scalar 문서는 하드 내비게이션으로 진입해야 마운트된다(#899). */}
            <a
              href="/docs"
              className="text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              앱 안에서 열기
              <ArrowRight className="size-3" aria-hidden />
            </a>
          </dd>
        </dl>
      </section>
    </article>
  );
}
