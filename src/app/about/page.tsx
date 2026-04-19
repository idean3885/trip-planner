import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ArrowRight, BookOpen, Layers } from "lucide-react";
import { projectMeta } from "@/lib/project-meta";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: `소개 — ${projectMeta.name}`,
  description: projectMeta.description,
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            홈
          </Link>
          <span aria-hidden>·</span>
          <span className="text-foreground">소개</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">
          {projectMeta.name}
        </h1>
        <p className="text-base leading-relaxed text-foreground">
          {projectMeta.tagline}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          이렇게 쓰게 됩니다
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          여행 주인이 &quot;이번 주말 제주 2박 3일, 바다가 보이는 숙소로&quot;처럼 말을
          건네면 일정이 자동으로 짜입니다. 초대받은 동행자는 웹에서 바로 일정을
          열어보고, 가고 싶은 곳을 덧붙이거나 시간을 조정합니다. 모든 변경은
          즉시 서로에게 공유되어 따로 정리할 필요가 없습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          좀 더 자세히 보기
        </h2>
        <p className="text-sm text-muted-foreground">
          아키텍처·개발 가이드·MCP 도구 설명 등 기술 문서는 GitHub에서 확인할 수
          있습니다.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={projectMeta.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <Card
              size="sm"
              className="h-full transition-all group-hover:ring-foreground/20 group-hover:-translate-y-px"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="size-4" aria-hidden />
                  기술 문서 허브
                </CardTitle>
                <CardDescription className="text-xs">
                  docs/ 디렉토리 전체 — 아키텍처·운영·협업 프로세스 목차
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                  GitHub에서 열기
                  <ExternalLink className="size-3" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </a>
          <a
            href={projectMeta.architectureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <Card
              size="sm"
              className="h-full transition-all group-hover:ring-foreground/20 group-hover:-translate-y-px"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Layers className="size-4" aria-hidden />
                  아키텍처 문서
                </CardTitle>
                <CardDescription className="text-xs">
                  시스템 구조·인증 흐름·데이터 접근 패턴·도메인 결합도
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                  ARCHITECTURE.md 열기
                  <ExternalLink className="size-3" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </a>
        </div>
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
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
            >
              {projectMeta.repoName}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </dd>

          <dt className="text-muted-foreground">API 문서</dt>
          <dd>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
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
