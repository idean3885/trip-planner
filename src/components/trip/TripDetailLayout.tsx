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
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
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

export interface LayoutDay {
  id: number;
  date: string;
  title: string | null;
  dayNumber: number;
  activities: LayoutActivity[];
}

export interface TripDetailLayoutProps {
  tripId: number;
  tripStart: Date | null;
  tripEnd: Date | null;
  days: LayoutDay[];
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
  canEdit,
  syncCard,
  memberList,
}: TripDetailLayoutProps) {
  const [days, setDays] = useState<LayoutDay[]>(initialDays);
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    computeInitialSelected(tripStart, tripEnd),
  );
  const [detailOpen, setDetailOpen] = useState(false);

  // #645 — 다른 날짜를 누르면 모바일 일정 목록 스크롤을 맨 위로 되돌린다.
  // sticky 캘린더 높이만큼 빼서 패널 머리가 캘린더 바로 아래에 오게 한다.
  const mobileStickyRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  const daysDates = useMemo(
    () => days.map((d) => new Date(d.date)),
    [days],
  );

  const selectedDay = useMemo(() => {
    const matched = days.find((d) =>
      sameLocalDay(new Date(d.date), selectedDate),
    );
    return matched ? { id: matched.id, activities: matched.activities } : null;
  }, [days, selectedDate]);

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
    setDays((prev) =>
      [
        ...prev,
        {
          id: created.id,
          date: created.date,
          title: null,
          dayNumber: 0,
          activities: [] as LayoutActivity[],
        },
      ].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    );
  }, []);

  const panel = (
    <DayActivitiesPane
      tripId={tripId}
      selectedDate={selectedDate}
      day={selectedDay}
      canEdit={canEdit}
      onDayCreated={handleDayCreated}
    />
  );

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
          {panel}
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
        <div ref={mobilePanelRef}>{panel}</div>
      </div>
    </>
  );
}
