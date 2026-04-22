/**
 * spec 023 — 동행자 역할 뱃지 렌더 규칙.
 *
 * 데이터 모델(`TripRole` enum)은 상호 배타지만 의미 계층상 **주인 ⊃ 호스트 ⊃ 게스트**.
 * UI는 주인에게 "주인" + "호스트" 두 뱃지를 노출해 포함 관계를 표면화한다.
 * 정본 용어는 `docs/glossary.md` 참조.
 *
 * 순수 함수로 분리되어 있어 서버 컴포넌트 의존성 없이 단위 테스트 가능.
 */

export type RoleBadgeTone = "primary" | "secondary" | "muted";

export interface RoleBadgeSpec {
  key: "OWNER" | "HOST" | "GUEST";
  label: string;
  tone: RoleBadgeTone;
}

export function rolesFor(role: string): RoleBadgeSpec[] {
  if (role === "OWNER") {
    return [
      { key: "OWNER", label: "주인", tone: "primary" },
      { key: "HOST", label: "호스트", tone: "secondary" },
    ];
  }
  if (role === "HOST") {
    return [{ key: "HOST", label: "호스트", tone: "secondary" }];
  }
  return [{ key: "GUEST", label: "게스트", tone: "muted" }];
}
