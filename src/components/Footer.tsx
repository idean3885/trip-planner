import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { projectMeta } from "@/lib/project-meta";

export default function Footer() {
  return (
    <footer className="border-border mt-auto border-t">
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
        <Link
          href="/docs"
          className="hover:text-foreground inline-flex items-center gap-1"
        >
          API 문서
          <ExternalLink className="size-3" aria-hidden />
        </Link>
      </div>
    </footer>
  );
}
