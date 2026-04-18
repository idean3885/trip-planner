import { redirect } from "next/navigation";

// 레거시 마크다운 경로 (#239로 소스 제거). 남은 외부 링크는 홈으로 리다이렉트.
export const dynamic = "force-dynamic";

export default async function LegacyDayPage() {
  redirect("/");
}
