import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { projectMeta } from "@/lib/project-meta";

import GithubIcon from "./GithubIcon";

export default function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="pt-2 pb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            여행 계획부터 현장까지 한 곳에서
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            대화로 만드는 여행 플래너
          </h1>
          <p className="text-muted-foreground text-base text-balance">
            {projectMeta.tagline}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              nativeButton={false}
              render={
                <Link
                  href={
                    isLoggedIn ? "/trips" : "/auth/signin?callbackUrl=/trips"
                  }
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
              GitHub에서 보기
            </Button>
          </div>
        </div>
        <Image
          src="/landing/hero-illustration.png"
          alt=""
          aria-hidden
          width={1100}
          height={930}
          priority
          className="mx-auto w-40 shrink-0 sm:w-48 lg:w-56"
        />
      </div>
    </section>
  );
}
