import type { Metadata } from "next";
import Link from "next/link";
import { projectMeta } from "@/lib/project-meta";

export const metadata: Metadata = {
  title: `About — ${projectMeta.name}`,
  description: projectMeta.description,
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-body-sm text-surface-500">
          <Link href="/" className="hover:text-surface-700">홈</Link>
          <span>/</span>
          <span className="text-surface-700">About</span>
        </div>
        <h1 className="text-2xl font-bold">{projectMeta.name}</h1>
        <p className="text-body text-surface-700">{projectMeta.description}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">프로젝트 배경</h2>
        <p className="text-body-sm text-surface-700 leading-relaxed">
          1인 개발자가 동행자와 함께 사용하기 위해 만든 여행 계획 도구입니다.
          AI 에이전트(Claude Code)가 자연어로 일정·숙소·항공편을 편성하고,
          웹앱은 결과를 열람·수정·공유하는 창구 역할을 합니다. 마크다운 시절의
          수작업 프로세스를 벗어나 DB 정본 + AX 중심 워크플로우로 전환 중입니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">정보</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
          <dt className="text-surface-500">저작자</dt>
          <dd className="text-surface-900">{projectMeta.author}</dd>

          <dt className="text-surface-500">라이선스</dt>
          <dd className="text-surface-900">{projectMeta.license}</dd>

          <dt className="text-surface-500">저장소</dt>
          <dd>
            <a
              href={projectMeta.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              GitHub ↗
            </a>
          </dd>

          <dt className="text-surface-500">API</dt>
          <dd>
            <Link href="/docs" className="text-primary-600 hover:underline">
              /docs →
            </Link>
          </dd>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">기술 스택</h2>
        <ul className="list-disc list-inside space-y-1 text-body-sm text-surface-700">
          {projectMeta.techStack.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
