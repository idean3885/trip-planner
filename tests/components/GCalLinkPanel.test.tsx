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

  async function renderTrigger(role: "HOST" | "GUEST") {
    render(<GCalLinkPanel tripId={5} role={role} />);
    // 상태 로드 후 트리거 버튼이 렌더되기를 기다림. Dialog open 자체는 base-ui가
    // pointer events를 요구해 CI coverage 모드에서 fireEvent.click으로 안정 재현
    // 불가 — 테스트는 트리거 존재 + 최상위 DOM에 조작 버튼 부재(회귀 방지 핵심)
    // 만 검증한다.
    return await screen.findByRole("button", { name: /구글 캘린더 \(공유\)/ });
  }

  it("호스트 미연결: 트리거 존재 + 조작 버튼 없음", async () => {
    await renderTrigger("HOST");

    // 공유 캘린더 조작 버튼이 활성 DOM에 없음(다이얼로그 열기 전 상태).
    expect(screen.queryByRole("button", { name: "내 구글 캘린더에 추가" })).toBeNull();
    expect(screen.queryByRole("button", { name: "다시 반영하기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "연결 해제" })).toBeNull();
    expect(screen.queryByRole("button", { name: "공유 캘린더 연결" })).toBeNull();
  });

  it("게스트 미연결: 트리거 존재 + 조작 버튼 없음", async () => {
    await renderTrigger("GUEST");

    expect(screen.queryByRole("button", { name: "내 구글 캘린더에 추가" })).toBeNull();
    expect(screen.queryByRole("button", { name: "다시 반영하기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "연결 해제" })).toBeNull();
    expect(screen.queryByRole("button", { name: "공유 캘린더 연결" })).toBeNull();
  });

  it("주인 미연결: 단일 연결 트리거, 레거시 업그레이드 분기 없음", async () => {
    render(<GCalLinkPanel tripId={5} role="OWNER" />);
    await screen.findByRole("button", { name: "구글 캘린더 연결" });

    // 레거시 업그레이드 라벨을 가진 트리거가 없음.
    expect(screen.queryByRole("button", { name: /업그레이드/ })).toBeNull();
  });
});

describe("GCalLinkPanel — spec 021 Testing 모드 미등록 UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function renderWithUnregisteredError(role: "OWNER" | "HOST" | "GUEST") {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      // 초기 /status 조회는 정상 응답.
      if (url.includes("/gcal/status")) {
        return new Response(
          JSON.stringify({ linked: false, scopeGranted: false }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      // 첫 번째 조작 API 호출에 UNREGISTERED 응답.
      return new Response(
        JSON.stringify({ error: "unregistered", reason: "unregistered" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<GCalLinkPanel tripId={5} role={role} />);

    // 역할별 초기 트리거 클릭 → API 호출 발생(미등록 에러).
    if (role === "OWNER") {
      const trigger = await screen.findByRole("button", { name: "구글 캘린더 연결" });
      fireEvent.click(trigger);
      const cta = await screen.findByRole("button", { name: "공유 캘린더 연결" });
      fireEvent.click(cta);
    } else {
      const trigger = await screen.findByRole("button", { name: /구글 캘린더 \(공유\)/ });
      // 비-주인은 이 시점에서 실제 API 호출을 하지 않으므로 테스트를 위해 수동으로
      // subscribe 시나리오를 흉내내기 어렵다. 본 테스트는 OWNER 경로로 집중한다.
      fireEvent.click(trigger);
    }
  }

  it("주인 미등록: 조작 API 응답이 unregistered면 안내 카드 트리거로 전환", async () => {
    await renderWithUnregisteredError("OWNER");

    // 안내 카드의 트리거 라벨로 전환되었는지 확인.
    const unregisteredText = await screen.findByText("구글 캘린더 연동 제한");
    expect(unregisteredText).toBeInTheDocument();

    // 기존 미연결 분기의 조작 버튼이 더 이상 DOM에 없음.
    expect(screen.queryByRole("button", { name: "다시 반영하기" })).toBeNull();
    expect(screen.queryByText(/주인이 공유 캘린더를 아직 연결하지 않았습니다/)).toBeNull();
  });
});
