import { redirect } from "next/navigation";

/**
 * spec 032 — Day 상세 페이지 제거.
 *
 * 일정 조회·편집이 모두 여행 상세(`/trips/[id]`)의 선택 날짜 패널로 들어왔다.
 * 기존 북마크·외부 링크가 깨지지 않도록 여행 상세로 이동시킨다.
 */
export default async function DayDetailRedirect({
  params,
}: {
  params: Promise<{ id: string; dayId: string }>;
}) {
  const { id } = await params;
  redirect(`/trips/${id}`);
}
