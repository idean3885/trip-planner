"use client";

/**
 * spec 032 — 여행 상세 캘린더 중심 단일 화면 오케스트레이터.
 *
 * 캘린더 셀 클릭 시 페이지 이동 없이 `selectedDate` 만 갱신하고, 선택 날짜의
 * 일정을 같은 화면 패널(`DayActivitiesPane`)에서 조회·추가·수정·삭제한다.
 * 빈 날짜에 첫 일정이 추가돼 Day 가 새로 생기면 `days` 상태에 반영해 캘린더의
 * 일정 표시와 패널이 같은 소스로 갱신된다.
 *
 * - 데스크탑(≥1024px): 좌(캘린더 확대 + 동기화 카드) / 우(동행자 + 선택 일정).
 * - 모바일(<1024px): sticky 캘린더(위로 스와이프 시 선택 주로 압축) + 선택
 *   일정. 동기화·동행자는 캘린더 상단 바의 "자세히" 로 한 단계 뒤에 둔다.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Ellipsis } from "lucide-react";
import { addDays } from "date-fns";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import {
  ACTIVITY_WINDOW_RADIUS,
  missingFetchRange,
} from "@/lib/activity-window";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarView } from "./CalendarView";
import { DayActivitiesPane, type DayCreatedPayload } from "./DayActivitiesPane";
import { SwipeCarousel } from "./SwipeCarousel";
import { TripDetailExtras } from "./TripDetailExtras";

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
  tripStart: Date | null;
  tripEnd: Date | null;
  /** 날짜 인덱스(전체). 활동 본문은 windowed 캐시로 따로 받는다. */
  days: LayoutDayIndex[];
  /** 진입 시 받은 선택일 윈도우의 활동(dayId → activities). */
  initialActivities: Record<number, LayoutActivity[]>;
  canEdit: boolean;
  /** 외부 캘린더 동기화 카드 (서버에서 만든 노드). */
  syncCard: ReactNode;
  /** 동행자 목록 (서버에서 만든 노드). */
  memberList: ReactNode;
}

/**
 * 두 Date 가 같은 "달력일" 인지 비교. floating-time 관행 #232 그대로 단순화.
 */
function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
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
  tripStart,
  tripEnd,
  days: initialDays,
  initialActivities,
  canEdit,
  syncCard,
  memberList,
}: TripDetailLayoutProps) {
  const [dayIndex, setDayIndex] = useState<LayoutDayIndex[]>(initialDays);
  const [activitiesByDayId, setActivitiesByDayId] = useState<
    Record<number, LayoutActivity[]>
  >(initialActivities);
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    computeInitialSelected(tripStart, tripEnd),
  );
  const [detailOpen, setDetailOpen] = useState(false);

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
      return { id: matched.id, activities: activitiesByDayId[matched.id] ?? null };
    },
    [dayIndex, activitiesByDayId],
  );

  const handleSelectDate = useCallback((date: Date | undefined) => {
    if (date) setSelectedDate(date);
  }, []);

  useEffect(() => {
    // 최초 마운트에서는 스크롤하지 않는다(이미 상단).
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const sticky = mobileStickyRef.current;
    const panel = mobilePanelRef.current;
    if (!sticky || !panel) return;
    // 데스크탑(lg:hidden)에서는 sticky 가 display:none → offsetHeight 0 → 스킵.
    const stickyH = sticky.offsetHeight;
    if (stickyH === 0) return;
    const target =
      panel.getBoundingClientRect().top + window.scrollY - stickyH - 8;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [selectedDate]);

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

  // 활동 CRUD 결과를 캐시에 반영해 날짜를 오가도 일관되게 유지한다(#669).
  // ActivityList 의 Activity(느슨한 cost union)를 캐시 LayoutActivity 로 받는다 —
  // 런타임 값은 동일(렌더는 cost 를 Number/String 로 방어 처리).
  const handleActivitiesChange = useCallback(
    (dayId: number, next: LayoutActivity[]) => {
      setActivitiesByDayId((prev) => ({ ...prev, [dayId]: next }));
    },
    [],
  );

  // 특정 날짜의 일정 패널. interactive=false(핍 슬라이드)는 읽기 전용으로 둔다.
  const renderPanel = (date: Date, interactive: boolean) => {
    const entry = dayForDate(date);
    return (
      <DayActivitiesPane
        tripId={tripId}
        selectedDate={date}
        day={entry}
        canEdit={interactive && canEdit}
        onDayCreated={handleDayCreated}
        onActivitiesChange={
          interactive && entry
            ? (next) =>
                handleActivitiesChange(entry.id, next as unknown as LayoutActivity[])
            : undefined
        }
      />
    );
  };

  return (
    <>
      {/* 데스크탑 ≥1024px — 좌(캘린더+동기화) / 우(동행자+선택 일정) 2분할. */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-grid-comfy lg:items-start">
        <div className="min-w-0 space-y-6">
          <CalendarView
            tripStart={tripStart}
            tripEnd={tripEnd}
            daysDates={daysDates}
            selected={selectedDate}
            onSelect={handleSelectDate}
            desktopFull
          />
          {syncCard}
        </div>
        <div className="min-w-0 space-y-6">
          {memberList}
          {renderPanel(selectedDate, true)}
        </div>
      </div>

      {/* 모바일 <1024px — sticky 캘린더 + 선택 일정. 동기화·동행자는 자세히
          다이얼로그(열기/닫기) 안에서만 본다(#645). */}
      <div className="space-y-4 lg:hidden">
        <div
          ref={mobileStickyRef}
          className="sticky top-0 z-20 -mx-4 bg-background px-4 pb-2 pt-1"
        >
          <div className="flex justify-end">
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-sm text-muted-foreground"
                  />
                }
              >
                <Ellipsis className="size-4" aria-hidden />
                자세히
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>여행 정보</DialogTitle>
                </DialogHeader>
                {/* 동행자(위) + 외부 캘린더 동기화(아래)를 한 묶음으로. */}
                <TripDetailExtras members={memberList} sync={syncCard} />
              </DialogContent>
            </Dialog>
          </div>
          <CalendarView
            tripStart={tripStart}
            tripEnd={tripEnd}
            daysDates={daysDates}
            selected={selectedDate}
            onSelect={handleSelectDate}
            enableMobileCompact
          />
        </div>
        {/* #657 — 하단 일정도 이전·현재·다음 날 3슬라이드로 드래그-팔로우 스와이프.
            핍 슬라이드(±1일)는 읽기 전용. 정착 시 선택 날짜를 하루 옮긴다. */}
        <div ref={mobilePanelRef}>
          <SwipeCarousel
            ariaLabel="선택 날짜 일정"
            anchorKey={selectedDate.toDateString()}
            onCommit={(dir) => setSelectedDate((d) => addDays(d, dir))}
            renderSlide={(off) =>
              renderPanel(addDays(selectedDate, off), off === 0)
            }
          />
        </div>
      </div>
    </>
  );
}
