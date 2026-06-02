import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  KeyRound,
  Layers,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          좀 더 자세히 보기
        </h2>
        <p className="text-muted-foreground text-sm">
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
              className="group-hover:ring-foreground/20 h-full transition-all group-hover:-translate-y-px"
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
                <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
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
              className="group-hover:ring-foreground/20 h-full transition-all group-hover:-translate-y-px"
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
                <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
                  ARCHITECTURE.md 열기
                  <ExternalLink className="size-3" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          외부 자동화·AI 클라이언트 연동
        </h2>
        <p className="text-muted-foreground text-sm">
          Personal Access Token으로 외부 도구에서 API를 직접 호출하거나, MCP
          서버로 Claude Code·Cursor 등 AI CLI에 연결할 수 있습니다.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/settings/tokens" className="group block">
            <Card
              size="sm"
              className="group-hover:ring-foreground/20 h-full transition-all group-hover:-translate-y-px"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <KeyRound className="size-4" aria-hidden />
                  PAT 발급
                </CardTitle>
                <CardDescription className="text-xs">
                  토큰 원문은 발급 시 1회만 노출됩니다. 화면을 닫기 전에 안전한
                  곳(키체인·비밀번호 관리자 등)에 보관하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
                  발급 페이지 열기
                  <ArrowRight className="size-3" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </Link>
          <a
            href={`${projectMeta.githubUrl}/tree/main/mcp`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <Card
              size="sm"
              className="group-hover:ring-foreground/20 h-full transition-all group-hover:-translate-y-px"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Terminal className="size-4" aria-hidden />
                  MCP / AI CLI 연결
                </CardTitle>
                <CardDescription className="text-xs">
                  trip MCP 서버 — Claude Code·Cursor 등에서 자연어로 일정
                  조회·수정. 아래 1줄로 설치·등록까지 자동 수행.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
                  설치 상세 (GitHub)
                  <ExternalLink className="size-3" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </a>
        </div>
        <div className="bg-muted/40 rounded-lg border p-3 text-xs">
          <p className="text-foreground mb-2 font-medium">
            맥북 1줄 설치 (Claude Code MCP 자동 등록)
          </p>
          <pre className="bg-background overflow-x-auto rounded p-2 font-mono text-[11px] leading-relaxed whitespace-pre">
            <code>{`curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash`}</code>
          </pre>
          <p className="text-muted-foreground mt-2">
            설치 중 브라우저가 열리면 Google 로그인만 하세요. 토큰이 자동
            저장되고 Claude Code에 MCP가 등록됩니다. 이후 Claude에게 자연어로
            요청하면 일정·항공·숙소를 자동으로 조회·편집합니다.
          </p>
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
              className="text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {projectMeta.repoName}
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
