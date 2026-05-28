"use client";

/**
 * spec 029 T021 — 월별 미니 캘린더.
 *
 * 여행 derived 기간(start ~ end) 강조 + 오늘 강조 + 일정이 있는 날짜 dot.
 * 통합 캘린더(US3, #590)에서 multi-trip 색을 부여할 수 있도록 `extraModifiers` /
 * `extraModifierClassNames` 슬롯을 노출한다. 본 컴포넌트는 단일 trip에서 사용해도
 * 동작하며, 다중 trip은 호출자가 modifiers를 합쳐 넘긴다.
 */

import * as React from "react";
import { ko } from "react-day-picker/locale";
import type { Matcher } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";

export interface CalendarViewProps {
  /** 여행 derived 시작일. 일정 ≥1건일 때 trip 기간 강조에 사용. */
  tripStart: Date | null;
  /** 여행 derived 종료일. 일정 ≥1건일 때 trip 기간 강조에 사용. */
  tripEnd: Date | null;
  /** 일정이 있는 날짜 목록 (dot 표시용). */
  daysDates: Date[];
  /** 선택된 날짜. 기본은 오늘 (오늘이 trip 기간 밖이면 trip 시작일). */
  selected?: Date;
  /** 날짜 클릭 핸들러. */
  onSelect?: (date: Date | undefined) => void;
  /** 통합 캘린더용 추가 modifiers. key가 modifier 이름, value가 매처. */
  extraModifiers?: Record<string, Matcher | Matcher[]>;
  /** extraModifiers와 짝을 이루는 className. */
  extraModifierClassNames?: Record<string, string>;
  className?: string;
}

export function CalendarView({
  tripStart,
  tripEnd,
  daysDates,
  selected,
  onSelect,
  extraModifiers,
  extraModifierClassNames,
  className,
}: CalendarViewProps) {
  const tripRange: Matcher | undefined =
    tripStart && tripEnd ? { from: tripStart, to: tripEnd } : undefined;

  const modifiers: Record<string, Matcher | Matcher[]> = {
    ...(tripRange ? { tripRange } : {}),
    hasActivity: daysDates,
    ...(extraModifiers ?? {}),
  };

  const modifiersClassNames: Record<string, string> = {
    tripRange: "bg-primary/10",
    hasActivity:
      "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary",
    ...(extraModifierClassNames ?? {}),
  };

  const defaultMonth = selected ?? tripStart ?? undefined;

  return (
    <Calendar
      mode="single"
      locale={ko}
      selected={selected}
      onSelect={onSelect}
      defaultMonth={defaultMonth}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      className={className}
    />
  );
}
