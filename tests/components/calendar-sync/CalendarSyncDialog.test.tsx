/**
 * spec 056 — 가져오기 전용 다이얼로그 회귀 가드.
 *
 * 내보내기/동기화 쓰기 진입점이 사라지고(US2/SC-002), 가져오기 전용 안내가
 * 노출되며(US5/SC-005), 가져오기 섹션만 렌더되는지 검증한다. 하위 섹션
 * (ImportSection/DraftSection)은 스텁으로 격리해 다이얼로그 구조만 본다.
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

describe("CalendarSyncDialog — 가져오기 전용", () => {
  it("제목이 가져오기 전용으로 표기된다", () => {
    renderDialog();
    expect(screen.getByText("외부 캘린더 가져오기")).toBeInTheDocument();
  });

  it("내보내기/동기화/다시 반영 등 쓰기 진입점이 없다", () => {
    renderDialog();
    const html = document.body.innerHTML;
    expect(html).not.toContain("내보내기");
    expect(html).not.toContain("동기화");
    expect(html).not.toContain("다시 반영");
  });

  it("가져오기 전용 안내(쓰지 않음 + 직접 정리)가 보인다", () => {
    renderDialog();
    expect(screen.getByText(/가져오기만/)).toBeInTheDocument();
    expect(screen.getByText(/직접 정리/)).toBeInTheDocument();
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
