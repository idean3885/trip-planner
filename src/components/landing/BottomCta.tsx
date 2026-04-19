import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectMeta } from "@/lib/project-meta";
import GithubIcon from "./GithubIcon";

export default function BottomCta() {
  return (
    <section aria-labelledby="cta-heading" className="py-8">
      <h2
        id="cta-heading"
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        시작해 볼까요
      </h2>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Google 계정으로 1초 로그인하면 바로 여행을 만들 수 있습니다. 코드를
          살펴보고 싶다면 저장소와 기술 문서가 함께 열려 있습니다.
        </p>
        <div className="flex flex-wrap gap-2">
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
            GitHub
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/about" />}
          >
            <BookOpen className="size-4" aria-hidden />
            프로젝트 소개
          </Button>
        </div>
      </div>
    </section>
  );
}
