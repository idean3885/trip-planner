import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { projectMeta } from "@/lib/project-meta";

import GithubIcon from "./GithubIcon";

export default function BottomCta({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section aria-labelledby="cta-heading" className="py-8">
      <h2
        id="cta-heading"
        className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
      >
        {isLoggedIn ? "이어서 계획하기" : "시작해 볼까요"}
      </h2>
      <div className="mt-4 space-y-3">
        <p className="text-muted-foreground text-sm">
          {isLoggedIn
            ? "여행 목록에서 일정을 이어서 다듬어 보세요. 코드를 살펴보고 싶다면 저장소와 기술 문서가 함께 열려 있습니다."
            : "Google 계정으로 로그인하면 바로 여행을 만들 수 있습니다. 코드를 살펴보고 싶다면 저장소와 기술 문서가 함께 열려 있습니다."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={
              <Link
                href={isLoggedIn ? "/trips" : "/auth/signin?callbackUrl=/trips"}
              />
            }
          >
            {isLoggedIn ? "여행 목록으로" : "시작하기"}
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
