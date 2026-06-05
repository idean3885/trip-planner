/**
 * spec 056 — 가져오기 전용 다이얼로그 회귀 가드.
 * spec 057 — 카피 간소화 검증: 코드명·기술 설명 박스 부재, 제목 + 한 줄 설명만.
 *
 * 하위 섹션(ImportSection/DraftSection)은 스텁으로 격리해 다이얼로그 구조·카피만 본다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/calendar-sync/sections/ImportSection", () => ({
  default: () => <div data-testid="import-section">import-section</div>,
}));
vi.mock("@/components/calendar-sync/sections/DraftSection", () => ({
  default: () => <div data-testid="draft-section">draft-section</div>,
}));

import CalendarSyncDialog from "@/components/calendar-sync/CalendarSyncDialog";

function renderDialog(role: "OWNER" | "HOST" | "GUEST" = "OWNER") {
  return render(
    <CalendarSyncDialog
      tripId={1}
      role={role}
      open={true}
      onOpenChange={() => {}}
    />,
  );
}

describe("CalendarSyncDialog — 가져오기 전용 + 카피 간소화", () => {
  it("제목 + 한 줄 설명만 보인다", () => {
    renderDialog();
    expect(screen.getByText("외부 캘린더 가져오기")).toBeInTheDocument();
    expect(
      screen.getByText("구글·애플 캘린더의 일정을 가져옵니다."),
    ).toBeInTheDocument();
  });

  it("프로젝트 코드명이 노출되지 않는다", () => {
    renderDialog();
    expect(document.body.innerHTML).not.toContain("trip-planner");
  });

  it("쓰기 진입점·기술 설명 문구가 없다", () => {
    renderDialog();
    const html = document.body.innerHTML;
    expect(html).not.toContain("내보내기");
    expect(html).not.toContain("동기화");
    expect(html).not.toContain("다시 반영");
    // "정본" 같은 기술·내부 설명 박스 제거 확인
    expect(html).not.toContain("정본");
    expect(html).not.toContain("쓰지 않습니다");
  });

  it("OWNER는 가져오기 섹션과 초안 섹션을 본다", () => {
    renderDialog("OWNER");
    expect(screen.getByTestId("import-section")).toBeInTheDocument();
    expect(screen.getByTestId("draft-section")).toBeInTheDocument();
  });

  it("GUEST는 가져오기 섹션이 보이지 않고 권한 안내만 본다", () => {
    renderDialog("GUEST");
    expect(screen.queryByTestId("import-section")).not.toBeInTheDocument();
    expect(screen.getByText(/호스트 이상 권한에서만 가능/)).toBeInTheDocument();
  });
});
