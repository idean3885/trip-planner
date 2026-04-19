import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectMeta } from "@/lib/project-meta";
import GithubIcon from "./GithubIcon";

export default function Hero() {
  return (
    <section className="pt-2 pb-8">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          오픈소스 · AI 에이전트 · 포트폴리오 프로젝트
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          대화로 만드는 여행 플래너
        </h1>
        <p className="text-base text-muted-foreground text-balance">
          {projectMeta.tagline}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            nativeButton={false}
            render={<Link href="/auth/signin?callbackUrl=/trips" />}
          >
            시작하기
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={
              <Link
                href={projectMeta.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <GithubIcon className="size-4" />
            GitHub에서 보기
          </Button>
        </div>
      </div>
    </section>
  );
}
