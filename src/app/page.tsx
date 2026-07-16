import type { Metadata } from "next";

import { auth } from "@/auth";
import LandingPage from "@/components/landing/LandingPage";
import { projectMeta } from "@/lib/project-meta";

export const metadata: Metadata = {
  title: projectMeta.name,
  description: projectMeta.description,
  // OG/트위터 이미지는 src/app/opengraph-image.tsx(파일 컨벤션)가 자동 생성·주입한다(#907).
  openGraph: {
    title: projectMeta.name,
    description: projectMeta.description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: projectMeta.name,
    description: projectMeta.description,
  },
};

export default async function Home() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);
  return <LandingPage isLoggedIn={isLoggedIn} />;
}
