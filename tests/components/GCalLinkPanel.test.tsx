/**
 * GCalLinkPanel — 미연결 상태의 역할별 UI 렌더 테스트 (spec 020).
 *
 * 핵심 요구:
 *   미연결(linked:false) + 비-주인(HOST/GUEST) → 트리거 버튼 + 다이얼로그(설명문 + "닫기"만).
 *   공유 캘린더 조작 버튼(추가/다시 반영/해제)은 렌더되지 않아야 한다(FR-001, FR-002).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GCalLinkPanel from "@/components/GCalLinkPanel";

describe("GCalLinkPanel — spec 020 미연결 비-주인 UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // status API가 linked:false를 반환하도록 fetch mock.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ linked: false, scopeGranted: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
  });

  async function renderAndOpen(role: "HOST" | "GUEST") {
    render(<GCalLinkPanel tripId={5} role={role} />);
    // 상태 로드 후 트리거 버튼이 렌더되기를 기다림.
    const trigger = await screen.findByRole("button", { name: /구글 캘린더 \(공유\)/ });
    fireEvent.click(trigger);
    // 다이얼로그 내용 대기.
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    return trigger;
  }

  it("호스트 미연결: 안내문 + '닫기' 하나만 노출, 조작 버튼 없음", async () => {
    await renderAndOpen("HOST");

    // 설명문 존재.
    expect(
      screen.getByText(/주인이 공유 캘린더를 아직 연결하지 않았습니다/)
    ).toBeInTheDocument();

    // '닫기' 버튼 존재.
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();

    // 공유 캘린더 조작 버튼이 없음.
    expect(screen.queryByRole("button", { name: "내 구글 캘린더에 추가" })).toBeNull();
    expect(screen.queryByRole("button", { name: "다시 반영하기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "연결 해제" })).toBeNull();
    expect(screen.queryByRole("button", { name: "공유 캘린더 연결" })).toBeNull();
  });

  it("게스트 미연결: 호스트와 동일한 안내 + '닫기'만", async () => {
    await renderAndOpen("GUEST");

    expect(
      screen.getByText(/주인이 공유 캘린더를 아직 연결하지 않았습니다/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "내 구글 캘린더에 추가" })).toBeNull();
    expect(screen.queryByRole("button", { name: "다시 반영하기" })).toBeNull();
  });

  it("주인 미연결: 단일 '공유 캘린더 연결' CTA (레거시 업그레이드 분기 없음)", async () => {
    render(<GCalLinkPanel tripId={5} role="OWNER" />);
    const trigger = await screen.findByRole("button", { name: "구글 캘린더 연결" });
    fireEvent.click(trigger);

    // 다이얼로그 내부의 CTA 버튼이 렌더되기를 기다림.
    const cta = await screen.findByRole("button", { name: "공유 캘린더 연결" });
    expect(cta).toBeInTheDocument();

    // 레거시 업그레이드/legacy 안내가 없음.
    expect(screen.queryByText(/업그레이드/)).toBeNull();
  });
});
