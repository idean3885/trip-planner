"use client";

import type { CalendarType } from "@/types/gcal";

interface Props {
  value: CalendarType;
  onChange: (next: CalendarType) => void;
}

/**
 * 전용 캘린더 자동 생성(기본) vs 기본 캘린더 사용 중 선택.
 * 스펙 Clarifications 5, FR-003.
 */
export default function GCalCalendarChoice({ value, onChange }: Props) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-foreground text-sm font-medium">
        캘린더 선택
      </legend>
      <label className="border-border hover:bg-muted/30 flex cursor-pointer items-start gap-2 rounded-md border p-2">
        <input
          type="radio"
          name="calendar-type"
          value="DEDICATED"
          checked={value === "DEDICATED"}
          onChange={() => onChange("DEDICATED")}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium">
            이 여행 전용 캘린더 자동 생성 (추천)
          </span>
          <span className="text-muted-foreground block text-xs">
            여행 종료 후 캘린더를 한 번에 숨기거나 지우기 쉽습니다.
          </span>
        </span>
      </label>
      <label className="border-border hover:bg-muted/30 flex cursor-pointer items-start gap-2 rounded-md border p-2">
        <input
          type="radio"
          name="calendar-type"
          value="PRIMARY"
          checked={value === "PRIMARY"}
          onChange={() => onChange("PRIMARY")}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium">
            내 기본 캘린더에 바로 넣기
          </span>
          <span className="text-muted-foreground block text-xs">
            개인 일정과 섞여 보입니다.
          </span>
        </span>
      </label>
    </fieldset>
  );
}
