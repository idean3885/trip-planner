"use client";

/**
 * spec 032 → spec 043 — 여행 상세 캘린더 중심 단일 화면 오케스트레이터.
 *
 * 캘린더 셀 클릭 시 페이지 이동 없이 `selectedDate` 만 갱신하고, 선택 날짜의
 * 일정을 같은 화면 패널(`DayActivitiesPane`)에서 조회·추가·수정·삭제한다.
 *
 * spec 043:
 * - 동작 버튼(기간 편집·동행자·나가기/삭제·캘린더 동기화·선택 일자 삭제)을 화면
 *   상단 액션바 한 줄로 모은다. 선택 일자 삭제는 `selectedDate` 의 Day 에만 동작.
 * - 선택 일자를 쿼리(`?d=YYYY-MM-DD`)에 반영해 새로고침·공유 시 유지한다.
 */

import { useGSAP } from "@gsap/react";
import { addDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);
import type { ActivityCategory, ReservationStatus } from "@prisma/client";

import type { Activity } from "@/components/ActivityList";
import DayDeleteButton from "@/components/DayDeleteButton";
import DeleteTripButton from "@/components/DeleteTripButton";
import InviteButton from "@/components/InviteButton";
import LeaveTripButton from "@/components/LeaveTripButton";
import TripPeriodDialog from "@/components/TripPeriodDialog";
import {
  ACTIVITY_WINDOW_RADIUS,
  missingFetchRange,
} from "@/lib/activity-window";

import { CalendarView } from "./CalendarView";
import { DayActivitiesPane, type DayCreatedPayload } from "./DayActivitiesPane";
import { SwipeCarousel } from "./SwipeCarousel";

export interface LayoutActivity {
  id: number;
  title: string;
  category: ActivityCategory;
  startTime: string | null;
  startTimezone: string | null;
  endTime: string | null;
  endTimezone: string | null;
  location: string | null;
  memo: string | null;
  cost: string | null;
  currency: string;
  reservationStatus: ReservationStatus | null;
  sortOrder: number;
}

/** 날짜 인덱스 — 활동 본문 없이 캘린더 점·기간·날짜→Day 매핑에 쓴다(#669). */
export interface LayoutDayIndex {
  id: number;
  date: string;
  title: string | null;
  dayNumber: number;
}

export interface TripDetailLayoutProps {
  tripId: number;
  tripTitle: string;
  isOwner: boolean;
  tripStart: Date | null;
  tripEnd: Date | null;
  /** 날짜 인덱스(전체). 활동 본문은 windowed 캐시로 따로 받는다. */
  days: LayoutDayIndex[];
  /** 진입 시 받은 선택일 윈도우의 활동(dayId → activities). */
  initialActivities: Record<number, LayoutActivity[]>;
  canEdit: boolean;
  /** 쿼리(?d=)에서 받은 초기 선택 일자("YYYY-MM-DD"). 없으면 기본 규칙. */
  initialSelected: string | null;
  /** 동행자 초대 다이얼로그에 끼우는 멤버 목록 노드(서버 생성). */
  memberList: ReactNode;
  /** 외부 캘린더 동기화 진입 버튼 (서버에서 만든 노드). */
  syncCard: ReactNode;
}

/**
 * 두 Date 가 같은 "달력일" 인지 비교. floating-time 관행 #232 그대로 단순화.
 */
function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Date → 쿼리용 로컬 "YYYY-MM-DD"(캘린더 선택과 같은 기준). */
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 쿼리 "YYYY-MM-DD" → 로컬 자정 Date. 형식 위반은 null. */
function parseSelectedYmd(ymd: string | null): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 진입 시 초기 선택 날짜 — 여행 기간 안에 오늘이 있으면 오늘, 없으면 여행
 * 첫날(일정 0건이면 오늘).
 */
export function computeInitialSelected(
  tripStart: Date | null,
  tripEnd: Date | null,
): Date {
  const today = new Date();
  if (tripStart && tripEnd && today >= tripStart && today <= tripEnd) {
    return today;
  }
  return tripStart ?? today;
}

export function TripDetailLayout({
  tripId,
  tripTitle,
  isOwner,
  tripStart,
  tripEnd,
  days: initialDays,
  initialActivities,
  canEdit,
  initialSelected,
  memberList,
  syncCard,
}: TripDetailLayoutProps) {
  const [dayIndex, setDayIndex] = useState<LayoutDayIndex[]>(initialDays);
  const [activitiesByDayId, setActivitiesByDayId] =
    useState<Record<number, LayoutActivity[]>>(initialActivities);
  const [selectedDate, setSelectedDate] = useState<Date>(
    () =>
      parseSelectedYmd(initialSelected) ??
      computeInitialSelected(tripStart, tripEnd),
  );

  // #645 — 다른 날짜를 누르면 모바일 일정 목록 스크롤을 맨 위로 되돌린다.
  // sticky 캘린더 높이만큼 빼서 패널 머리가 캘린더 바로 아래에 오게 한다.
  const mobileStickyRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  // #669 — 윈도우 프리페치 중복 요청 방지(같은 범위 동시 요청 차단).
  const inFlightRef = useRef<Set<string>>(new Set());

  const daysDates = useMemo(
    () => dayIndex.map((d) => new Date(d.date)),
    [dayIndex],
  );

  // spec 040 — 데스크탑 넓은 셀에 노출할 날짜→Day 제목 맵(추가 조회 없이 인덱스 재사용).
  const dayTitles = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const d of dayIndex) m.set(new Date(d.date).toDateString(), d.title);
    return m;
  }, [dayIndex]);

  // #669 — 선택일 윈도우(±N)에서 아직 캐시에 없는 Day 의 활동을 백그라운드로
  // 받아 캐시에 채운다. 캐시가 채워지면 effect 가 재실행돼 missingFetchRange 가
  // null 을 돌려 더 받지 않는다(루프 없음).
  useEffect(() => {
    const loadedIds = new Set(
      Object.keys(activitiesByDayId).map((k) => Number(k)),
    );
    const range = missingFetchRange(
      selectedDate,
      ACTIVITY_WINDOW_RADIUS,
      dayIndex,
      loadedIds,
    );
    if (!range) return;
    const key = `${range.from}_${range.to}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/trips/${tripId}/days?activities=1&from=${range.from}&to=${range.to}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const fetched = (await res.json()) as {
          id: number;
          activities: LayoutActivity[];
        }[];
        if (cancelled) return;
        setActivitiesByDayId((prev) => {
          const next = { ...prev };
          for (const d of fetched) next[d.id] = d.activities;
          return next;
        });
      } finally {
        inFlightRef.current.delete(key);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, selectedDate, dayIndex, activitiesByDayId]);

  // 날짜 → Day. 없으면 null(Day 미생성). activities null = 아직 로딩 안 됨(스켈레톤).
  const dayForDate = useCallback(
    (date: Date) => {
      const matched = dayIndex.find((d) =>
        sameLocalDay(new Date(d.date), date),
      );
      if (!matched) return null;
      return {
        id: matched.id,
        activities: activitiesByDayId[matched.id] ?? null,
      };
    },
    [dayIndex, activitiesByDayId],
  );

  // 선택 일자의 Day id(없으면 null) — 액션바 "일자 삭제" 노출 판단.
  const selectedDayId = dayForDate(selectedDate)?.id ?? null;

  const handleSelectDate = useCallback((date: Date | undefined) => {
    if (date) setSelectedDate(date);
  }, []);

  // spec 043 US5 — 선택 일자를 쿼리에 반영(history 만 갱신, 서버 재요청 없음).
  // 진입·새로고침 복원은 서버가 ?d 를 읽어 initialSelected 로 넘긴다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ymd = toYmd(selectedDate);
    const url = new URL(window.location.href);
    if (url.searchParams.get("d") !== ymd) {
      url.searchParams.set("d", ymd);
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, [selectedDate]);

  useEffect(() => {
    // 최초 마운트에서는 스크롤하지 않는다(이미 상단).
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    // #645 → spec 037 — 다른 날짜를 누르면 일정 패널 상단이 sticky 캘린더 바로
    // 아래에 오도록 페이지를 스크롤한다(단일 document 스크롤). 캘린더 높이만큼
    // 빼 패널 머리가 캘린더에 가려지지 않게 한다. 데스크탑은 sticky 높이 0이라 스킵.
    const sticky = mobileStickyRef.current;
    const panel = mobilePanelRef.current;
    if (!sticky || !panel) return;
    const stickyH = sticky.offsetHeight;
    if (stickyH === 0) return;
    const target =
      panel.getBoundingClientRect().top + window.scrollY - stickyH - 8;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [selectedDate]);

  // spec 037 — 모바일 단일 스크롤 + 캘린더 경계 1회 멈춤(GSAP ScrollTrigger).
  // CSS scroll-snap 은 "오버슈트 후 복귀"라 사용자가 본 되돌림을 못 없앤다(v3.8.x).
  // GSAP snap 으로 헤더가 사라지고 캘린더가 sticky 고정되는 경계(sticky.offsetTop)
  // 한 지점에서만 정지시키고, 그 이후 일정 구간은 정지점을 두지 않아 자유 스크롤한다.
  // duration 을 짧게 둬 "벽"에 가깝게 한다. 모바일(<1024px)에서만 matchMedia 로
  // 켜고, 데스크탑·다른 페이지에는 영향이 없도록 cleanup 에서 revert 한다.
  useGSAP(() => {
    const sticky = mobileStickyRef.current;
    if (!sticky) return;
    const mm = gsap.matchMedia();
    mm.add("(max-width: 1023px)", () => {
      const st = ScrollTrigger.create({
        snap: {
          snapTo: (value, self) => {
            const max = ScrollTrigger.maxScroll(window);
            if (max <= 0) return value;
            // spec 043 US4 — vh 근사(뷰포트 방식)가 실기기에서 부정확해 경계가
            // 안 잡혔다. sticky 가 top-0 으로 고정되는 실제 위치(offsetTop)를
            // 직접 경계로 쓴다.
            const boundary = sticky.offsetTop;
            if (!Number.isFinite(boundary) || boundary <= 0) return value;
            const scroll = value * max;
            const goingDown = !self || self.direction === 1;
            if (goingDown && scroll > boundary * 0.4 && scroll < boundary) {
              return boundary / max;
            }
            return value;
          },
          duration: 0.12,
          ease: "power2.out",
          directional: true,
        },
      });
      return () => st.kill();
    });
    return () => mm.revert();
  });

  const handleDayCreated = useCallback((created: DayCreatedPayload) => {
    setDayIndex((prev) =>
      [
        ...prev,
        { id: created.id, date: created.date, title: null, dayNumber: 0 },
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    );
    // 새 Day 는 빈 활동으로 캐시에 둔다(로딩 완료 상태).
    setActivitiesByDayId((prev) => ({ ...prev, [created.id]: [] }));
  }, []);

  // spec 043 US2 — 선택 일자 삭제 후 캐시·인덱스에서 제거(페이지 이동 없이).
  const handleDayDeleted = useCallback((deletedDayId: number) => {
    setDayIndex((prev) => prev.filter((d) => d.id !== deletedDayId));
    setActivitiesByDayId((prev) => {
      const next = { ...prev };
      delete next[deletedDayId];
      return next;
    });
  }, []);

  // 활동 CRUD 결과를 캐시에 반영해 날짜를 오가도 일관되게 유지한다(#669). dayId
  // 동반 단일 안정 핸들러 — 패널마다 새 클로저를 안 만들어 memo 가 산다(#673).
  const handleActivitiesChange = useCallback(
    (dayId: number, next: Activity[]) => {
      setActivitiesByDayId((prev) => ({
        ...prev,
        [dayId]: next as unknown as LayoutActivity[],
      }));
    },
    [],
  );

  // 모바일 캐러셀의 이전·현재·다음 날짜를 selectedDate 기준으로 메모이즈 —
  // 핍 슬라이드 날짜가 매 렌더 새 Date 가 되어 memo 가 깨지던 것을 막는다(#673).
  const mobileDates = useMemo(
    () => [addDays(selectedDate, -1), selectedDate, addDays(selectedDate, 1)],
    [selectedDate],
  );

  // 특정 날짜의 일정 패널. interactive=false(핍 슬라이드)는 읽기 전용으로 둔다.
  const renderPanel = (
    date: Date,
    interactive: boolean,
    showDateHeader = true,
  ) => {
    const entry = dayForDate(date);
    return (
      <DayActivitiesPane
        tripId={tripId}
        selectedDate={date}
        dayId={entry?.id ?? null}
        activities={entry?.activities ?? null}
        canEdit={interactive && canEdit}
        onDayCreated={handleDayCreated}
        onActivitiesChange={interactive ? handleActivitiesChange : undefined}
        showDateHeader={showDateHeader}
      />
    );
  };

  // spec 043 US2 — 동작 버튼 한 줄. 데스크탑·모바일 공통(캘린더 위, 비고정).
  const actionBar = (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <TripPeriodDialog
          tripId={tripId}
          currentStart={tripStart}
          currentEnd={tripEnd}
        />
      )}
      {canEdit && selectedDayId != null && (
        <DayDeleteButton
          tripId={tripId}
          dayId={selectedDayId}
          onDeleted={() => handleDayDeleted(selectedDayId)}
        />
      )}
      {syncCard}
      {canEdit && <InviteButton tripId={tripId} memberList={memberList} />}
      <div className="ml-auto flex items-center gap-2">
        {isOwner ? (
          <DeleteTripButton tripId={tripId} tripTitle={tripTitle} />
        ) : (
          <LeaveTripButton tripId={tripId} tripTitle={tripTitle} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {actionBar}

      {/* 데스크탑 ≥1024px — 좌(캘린더) / 우(선택 일정) 2분할. */}
      <div className="lg:gap-grid-comfy hidden lg:grid lg:grid-cols-2 lg:items-start">
        {/* spec 043 US4 — 데스크탑은 좌측 캘린더를 sticky 로 고정해 우측 일정이
            길어도 캘린더가 화면에 남는다(모바일 경계 멈춤의 데스크탑 대응). */}
        <div className="min-w-0 lg:sticky lg:top-6">
          <CalendarView
            tripStart={tripStart}
            tripEnd={tripEnd}
            daysDates={daysDates}
            dayTitles={dayTitles}
            selected={selectedDate}
            onSelect={handleSelectDate}
            desktopFull
          />
        </div>
        <div className="min-w-0 space-y-6">{renderPanel(selectedDate, true)}</div>
      </div>

      {/* 모바일 <1024px — sticky 캘린더 + 선택 일정. 동기화·동행자·기간 편집은
          위 액션바 버튼으로 연다(spec 043 — 단일 진입). */}
      <div className="space-y-4 lg:hidden">
        <div
          ref={mobileStickyRef}
          className="bg-background sticky top-0 z-20 -mx-4 px-4 pt-1 pb-2"
        >
          <CalendarView
            tripStart={tripStart}
            tripEnd={tripEnd}
            daysDates={daysDates}
            selected={selectedDate}
            onSelect={handleSelectDate}
            enableMobileCompact
          />
        </div>
        {/* #657 — 하단 일정도 이전·현재·다음 날 3슬라이드로 드래그-팔로우 스와이프. */}
        <div ref={mobilePanelRef}>
          <SwipeCarousel
            ariaLabel="선택 날짜 일정"
            anchorKey={selectedDate.toDateString()}
            syncHeight
            onCommit={(dir) => setSelectedDate((d) => addDays(d, dir))}
            renderSlide={(off) =>
              renderPanel(mobileDates[off + 1], off === 0, false)
            }
          />
        </div>
      </div>
    </div>
  );
}
