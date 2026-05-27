/**
 * spec 027 — Activity / ActivityDraft 관련 권한 헬퍼.
 *
 * 헌법 VI Permission Matrix(ADR 0006)에서 정의한 행위 단위 권한 함수를 모아둔다.
 * 정책 변경 시 본 파일과 헌법 매트릭스, ADR 0006 표를 함께 갱신.
 *
 * - 외부 캘린더 import: OWNER·HOST O, GUEST X (일정 편집과 동일 클래스)
 * - draft 승격 / 다시 가져오기 / 삭제: 동일 클래스
 *
 * 본 헬퍼는 순수 함수(역할 기반)와 DB 조회 헬퍼를 분리한다.
 * - 순수 함수: 단위 테스트·UI 사전 비활성화에 사용
 * - DB 헬퍼: API route에서 호출 (DB 정본 검증)
 */
import { prisma } from "@/lib/prisma";
import type { TripRole } from "@prisma/client";

const EDIT_ROLES: TripRole[] = ["OWNER", "HOST"];

/** 외부 캘린더 import / draft 관리 권한 (순수 함수). */
export function canImportCalendar(role: TripRole | null | undefined): boolean {
  if (!role) return false;
  return EDIT_ROLES.includes(role);
}

/** DB 조회 헬퍼. trip 비멤버면 false. */
export async function userCanImportCalendar(tripId: number, userId: string): Promise<boolean> {
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });
  return canImportCalendar(member?.role);
}
