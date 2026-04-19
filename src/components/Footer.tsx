import Link from "next/link";
import { projectMeta } from "@/lib/project-meta";

export default function Footer() {
  return (
    <footer className="border-t border-surface-100 mt-auto">
      <div className="max-w-content mx-auto w-full px-4 py-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-body-sm text-surface-500">
        <span>Made by {projectMeta.author}</span>
        <span aria-hidden="true" className="text-surface-300">·</span>
        <a
          href={projectMeta.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-surface-700"
        >
          GitHub ↗
        </a>
        <span aria-hidden="true" className="text-surface-300">·</span>
        <Link href="/about" className="hover:text-surface-700">
          About
        </Link>
        <span aria-hidden="true" className="text-surface-300">·</span>
        <Link href="/docs" className="hover:text-surface-700">
          API Docs ↗
        </Link>
      </div>
    </footer>
  );
}
