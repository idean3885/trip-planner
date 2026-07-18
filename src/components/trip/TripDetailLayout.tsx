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

import type { ActivityCategory, PaymentTiming } from "@prisma/client";
import { addDays } from "date-fns";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import type { CurrencySummary, KrwConversion, RateMap } from "@/lib/expense";

import { CalendarView } from "./CalendarView";
import { DayActivitiesPane, type DayCreatedPayload } from "./DayActivitiesPane";
import { ExpenseSummary } from "./ExpenseSummary";
import { SwipeCarousel } from "./SwipeCarousel";
import { TripActionsMenu } from "./TripActionsMenu";
import { TripInfoDialog } from "./TripInfoDialog";
import { TripQuickAdd } from "./TripQuickAdd";

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
  paymentTiming: PaymentTiming;
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
  /** spec 063 후속 — 헤더 브레드크럼(서버 생성). ☰ 메뉴와 같은 줄에 둔다. */
  breadcrumb?: ReactNode;
  /** spec 063 후속 — 동행자 인원수(여행 정보 메뉴 표시용). */
  memberCount: number;
  /** spec 063 후속 — 여행 설명 원문(여행 정보 메뉴에서 보기·수정). */
  description: string | null;
  /** 동행자 초대 다이얼로그에 끼우는 멤버 목록 노드(서버 생성). */
  memberList: ReactNode;
  /** 외부 캘린더 동기화 진입 버튼 (서버에서 만든 노드). */
  syncCard: ReactNode;
  /** spec 061 — 추가 폼 지출시점 디폴트(서버 계산: 여행중=현장 / 여행전=사전). */
  timingDefault?: PaymentTiming;
  /** 여행 총액 합산(서버 계산). 지출이 주안점이라 메인 동선에 둔다. */
  tripSummary?: CurrencySummary[];
  /** 여행 총액 원화 근사 환산(참고용). */
  tripKrw?: KrwConversion | null;
  /** spec 062 — (일자, 통화) 근사 환율 맵. 일별 합산 원화 병기에 쓴다. */
  rateMap?: RateMap;
  /** spec 061 US3 — 여행 중이면 모바일 캘린더를 주간 뷰로 진입(서버 판정). */
  tripInProgress?: boolean;
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
  breadcrumb,
  memberCount,
  description,
  memberList,
  syncCard,
  timingDefault,
  tripSummary,
  tripKrw,
  rateMap,
  tripInProgress,
}: TripDetailLayoutProps) {
  const [dayIndex, setDayIndex] = useState<LayoutDayIndex[]>(initialDays);
  const [activitiesByDayId, setActivitiesByDayId] =
    useState<Record<number, LayoutActivity[]>>(initialActivities);
  const [selectedDate, setSelectedDate] = useState<Date>(
    () =>
      parseSelectedYmd(initialSelected) ??
      computeInitialSelected(tripStart, tripEnd),
  );

  // #669 — 윈도우 프리페치 중복 요청 방지(같은 범위 동시 요청 차단).
  const inFlightRef = useRef<Set<string>>(new Set());
  // v3.15.1 — 모바일 캘린더 접힘은 스크롤 방향으로 결정한다. 아래로 스크롤하면
  // 접고(주간), 최상단으로 돌아오면 펼친다(월간). 과거 sentinel + IntersectionObserver
  // 방식(spec 051)은 (1) 콘텐츠가 짧으면 sentinel 이 화면 밖으로 못 나가 트리거가 안
  // 되고, (2) 접히며 문서가 짧아져 스크롤이 최상단으로 튀는 버그가 있었다. 방향 감지는
  // 콘텐츠 길이와 무관하게 동작한다.
  const lastScrollYRef = useRef(0);
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);

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

  // v3.15.1 — 스크롤 방향으로 모바일 캘린더 접힘을 제어한다. 아래로 스크롤하면
  // 즉시 주간으로 접고, 최상단(scrollY ≤ 4)으로 돌아오면 월간으로 펼친다.
  // spec 058 — 클램프 가드: 문서가 뷰포트보다 짧아 스크롤이 불가한 상태(maxScroll≤4)
  // 에서는 브라우저가 강제한 scrollY≈0 을 "사용자가 최상단으로 올림"으로 오인하지
  // 않는다. 직전 버전(v3.17.1)은 이 오인을 막으려 하단을 한 화면(100svh)으로 채워
  // 항상 스크롤 가능 상태를 유지했는데 빈 여백이 과했다. 가드를 두면 하단 높이를
  // 줄여(스크롤 불가가 되어도) 접힘이 최상단으로 튕겨 다시 펼쳐지는 플립이 없다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      // #919 — 스크롤 불가(짧은 콘텐츠)면 접힐 이유가 없다. 접힘을 풀어 월↔주 토글을
      // 되살린다. 일정 없는 짧은 날짜를 고르면 콘텐츠가 짧아지며 브라우저가 scrollY 를
      // 클램프해 이 핸들러가 다시 돌고, 여기서 주간 고착을 해제한다.
      if (maxScroll <= 4) {
        setIsCalendarCollapsed(false);
        lastScrollYRef.current = y;
        return;
      }
      if (y <= 4) {
        setIsCalendarCollapsed(false);
      } else if (y > lastScrollYRef.current) {
        setIsCalendarCollapsed(true);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // #919 — 선택 날짜·활동이 바뀌어 콘텐츠 높이가 변하면 접힘을 재평가한다. 스크롤
  // 클램프 이벤트가 안 나는 경우(이미 최상단 근처)에도 짧은 콘텐츠면 펼쳐 토글을 살린다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raf = requestAnimationFrame(() => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 4) setIsCalendarCollapsed(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedDate, activitiesByDayId]);

  // 날짜 변경 시 강제 스크롤(#645)은 제거했다. 짧은 콘텐츠에서 스크롤 목표가 최상단
  // 근처로 계산돼 페이지가 맨 위로 튀는 버그가 있었고, 스와이프로 날짜를 바꿀 때마다
  // 스크롤 위치가 끌려가 일관성을 해쳤다. 이제 날짜를 바꿔도 스크롤 위치를 그대로 둔다.
  // 캘린더는 sticky 로 상단에 머물러 선택 일정이 바로 아래에 보인다.

  // 캘린더 경계 멈춤 강제 보정은 제거했다(#730). 여러 방식(scroll-snap·중첩 스크롤·
  // GSAP snap)이 기기·환경에 따라 안 잡히거나 스크롤이 끊기는 부작용을 남겨, 보정을
  // 두기보다 네이티브 자유 스크롤을 택한다. 캘린더는 sticky 로 상단에 머문다.

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

  // #846 — 떠 있는 TripQuickAdd 가 활동을 새로 만들면 그 Day 캐시 끝에 덧붙인다.
  // 빈 날짜는 handleDayCreated 가 먼저 빈 배열을 채워두므로 항상 배열이 있다.
  const handleActivityCreated = useCallback(
    (dayId: number, created: Activity) => {
      setActivitiesByDayId((prev) => ({
        ...prev,
        [dayId]: [...(prev[dayId] ?? []), created as unknown as LayoutActivity],
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
        rateMap={rateMap}
      />
    );
  };

  // spec 063 후속 — 동작 버튼이 늘어 화면을 채우던 것을 우상단 햄버거(☰) 한 곳으로
  // 모은다. "여행 정보(설명·인원, 수정 가능)"도 같은 메뉴 항목으로 둔다.
  const actionBar = (
    <TripActionsMenu>
      <TripInfoDialog
        tripId={tripId}
        memberCount={memberCount}
        description={description}
        canEdit={canEdit}
      />
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
      {isOwner ? (
        <DeleteTripButton tripId={tripId} tripTitle={tripTitle} />
      ) : (
        <LeaveTripButton tripId={tripId} tripTitle={tripTitle} />
      )}
    </TripActionsMenu>
  );

  return (
    <div className="-mt-6 space-y-4">
      {/* #938 — 헤더와 도킹: main pt-6 간격을 당겨 붙임 */}
      {/* spec 063 후속 — 브레드크럼(날짜)과 ☰ 메뉴를 한 줄에 둬 빈 줄을 없앤다.
          #936 — 다른 섹션과 동일한 글래스 표면으로 통일(SiteHeader 유리 바와 같은 톤). */}
      {/* #938 — 상단 헤더 유리 바와 도킹: 위 모서리 각지게 + 상단 테두리 제거해
          헤더 하단과 이어 하나의 앱바처럼 보이게 한다(SiteHeader 가 rounded-b-none). */}
      <div className="glass-surface border-foreground/10 relative z-30 flex items-center justify-between gap-2 rounded-xl rounded-t-none border border-t-0 px-4 py-2.5 shadow-xs">
        {/* #942 — glass-surface(backdrop-filter)가 만든 stacking context에 ☰ 드롭다운이
            갇혀 sticky 캘린더(z-20) 뒤로 숨던 회귀. 바를 z-30 으로 올려 위에 둔다. */}
        <div className="min-w-0 flex-1">{breadcrumb}</div>
        {actionBar}
      </div>

      {/* 여행 총액 — "총 얼마 썼는가"가 주안점이라 메인 동선(액션바 아래)에 둔다.
          현화 + 원화 근사(참고) 병기. 빈 합산은 ExpenseSummary 가 숨긴다. */}
      {tripSummary && tripSummary.length > 0 && (
        <ExpenseSummary rows={tripSummary} label="여행 총액" krw={tripKrw} />
      )}

      {/* 데스크탑 ≥1024px — 좌(캘린더) / 우(선택 일정) 2분할. */}
      <div className="lg:gap-grid-comfy hidden lg:grid lg:grid-cols-2 lg:items-start">
        {/* spec 043 US4 — 데스크탑은 좌측 캘린더를 sticky 로 고정해 우측 일정이
            길어도 캘린더가 화면에 남는다(모바일 경계 멈춤의 데스크탑 대응). */}
        <div className="glass-surface border-foreground/10 min-w-0 rounded-xl border p-2 shadow-xs lg:sticky lg:top-6">
          {/* #938 — 데스크탑 캘린더도 유리 표면 통일 */}
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
        <div className="min-w-0 space-y-6">
          {renderPanel(selectedDate, true)}
        </div>
      </div>

      {/* 모바일 <1024px — sticky 캘린더 + 선택 일정. 동기화·동행자·기간 편집은
          위 액션바 버튼으로 연다(spec 043 — 단일 진입). */}
      <div className="space-y-4 lg:hidden">
        {/* #915 — 주간 달력을 일정 섹션과 같은 콘텐츠 폭에 맞춘다(풀블리드 제거).
            #936 — 다른 섹션(브레드크럼·일정·빈상태)과 동일한 글래스 표면으로 통일한다
            (SiteHeader 유리 바와 같은 glass-surface + border + rounded + shadow). 앞서
            투명+블러는 표면이 없어 글래스가 깨져 보였다. sticky 유지. */}
        <div className="glass-surface border-foreground/10 sticky top-0 z-20 rounded-xl border p-2 shadow-xs">
          {/* #936 — 통일 글래스 표면 */}
          <CalendarView
            tripStart={tripStart}
            tripEnd={tripEnd}
            daysDates={daysDates}
            selected={selectedDate}
            onSelect={handleSelectDate}
            enableMobileCompact
            collapsed={isCalendarCollapsed}
            defaultWeekView={tripInProgress}
          />
        </div>
        {/* #657 — 하단 일정도 이전·현재·다음 날 3슬라이드로 드래그-팔로우 스와이프.
            spec 058 — 하단 영역 최소 높이를 화면 절반(50svh)으로 둔다. 스와이프·세로
            스크롤 영역은 충분히 두되, 빈/적은 일정 날에 한 화면을 통째로 비우지 않는다.
            #772 의 100svh 는 빈 여백이 과했다. 접힘 플립은 높이가 아니라 위 onScroll 의
            클램프 가드로 막으므로(짧은 문서의 scrollY≈0 무시) 높이를 줄여도 안전하다. */}
        <SwipeCarousel
          className="min-h-[50svh]"
          ariaLabel="선택 날짜 일정"
          anchorKey={selectedDate.toDateString()}
          syncHeight
          onCommit={(dir) => setSelectedDate((d) => addDays(d, dir))}
          renderSlide={(off) =>
            renderPanel(mobileDates[off + 1], off === 0, false)
          }
        />
      </div>

      {/* #846 — 화면 하단에 떠 있는 단일 "활동 추가". 캘린더 스와이프 캐러셀이
          내부 sticky/fixed 를 가두므로, 추가 컨트롤을 캐러셀 밖(레이아웃 레벨)에
          두어 스크롤·날짜와 무관하게 한 탭으로 선택 일자에 활동을 추가한다. */}
      {canEdit && (
        <TripQuickAdd
          tripId={tripId}
          selectedDate={selectedDate}
          dayId={selectedDayId}
          timingDefault={timingDefault}
          onDayCreated={handleDayCreated}
          onActivityCreated={handleActivityCreated}
        />
      )}
    </div>
  );
}
