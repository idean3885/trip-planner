import { redirect } from "next/navigation";
import { getAllTripSlugs, getAllDays } from "@/lib/trips";

export async function generateStaticParams() {
  const slugs = getAllTripSlugs();
  const params: { num: string }[] = [];

  for (const slug of slugs) {
    const days = await getAllDays(slug);
    for (const day of days) {
      params.push({ num: day.slug });
    }
  }
  return params;
}

export default async function LegacyDayPage({
  params,
}: {
  params: Promise<{ num: string }>;
}) {
  const { num } = await params;
  const slugs = getAllTripSlugs();

  if (slugs.length > 0) {
    redirect(`/trips/${slugs[0]}/day/${num}`);
  }

  redirect("/");
}
