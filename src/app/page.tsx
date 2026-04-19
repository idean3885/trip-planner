import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { projectMeta } from "@/lib/project-meta";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: projectMeta.name,
  description: projectMeta.description,
  openGraph: {
    title: projectMeta.name,
    description: projectMeta.description,
    type: "website",
    images: [
      {
        url: "/landing/hero-og.png",
        width: 1200,
        height: 630,
        alt: `${projectMeta.name} — ${projectMeta.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: projectMeta.name,
    description: projectMeta.description,
    images: ["/landing/hero-og.png"],
  },
};

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/trips");
  }
  return <LandingPage />;
}
