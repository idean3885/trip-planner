import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { projectMeta } from "@/lib/project-meta";

export default function Footer() {
  // spec 057 — 분석이 활성일 때만 쿠키 사용 고지를 노출(개인정보 고지).
  const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_GA_ID);
  return (
    <footer className="glass-surface border-foreground/10 mt-auto border-t">
      {/* spec 065/068 — 글래스 표면 + 상단 테두리 색 */}
      <div className="text-muted-foreground mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-6 text-sm">
        <span>Made by {projectMeta.author}</span>
        <span aria-hidden className="text-muted-foreground/60">
          ·
        </span>
        <a
          href={projectMeta.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground inline-flex items-center gap-1"
        >
          GitHub
          <ExternalLink className="size-3" aria-hidden />
        </a>
        <span aria-hidden className="text-muted-foreground/60">
          ·
        </span>
        <Link href="/about" className="hover:text-foreground">
          소개
        </Link>
        <span aria-hidden className="text-muted-foreground/60">
          ·
        </span>
        {/* API 문서(Scalar)는 최초 문서 로드 시 마운트돼, 소프트 내비게이션으로는
            빈 화면이 된다(#899). 설정 화면과 동일하게 하드 내비게이션으로 진입한다. */}
        <a
          href="/docs"
          className="hover:text-foreground inline-flex items-center gap-1"
        >
          API 문서
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
      {analyticsEnabled && (
        <p className="text-muted-foreground/70 mx-auto w-full max-w-2xl px-4 pb-6 text-center text-xs">
          사용 통계를 위해 분석 쿠키를 사용합니다.
        </p>
      )}
    </footer>
  );
}
