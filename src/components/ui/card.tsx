import * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  glass = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm";
  // spec 065 — 글래스 표면 opt-in. 기본은 불투명(bg-card). true 는 단일 인스턴스
  // 컨테이너 카드에만 켠다(스크롤 목록의 콘텐츠 카드는 성능 위해 불투명 유지).
  glass?: boolean;
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-glass={glass ? "true" : undefined}
      className={cn(
        // spec 068 — 테두리를 ring(바깥 box-shadow) 대신 border(박스모델)로. ring 은
        // overflow-hidden 조상(스와이프 캐러셀 등)이 좌/우/상단을 잘라 테두리가 군데군데
        // 사라지던 고질 버그의 원인. border 는 요소 자기 박스 안이라 조상 overflow 무관.
        "group/card text-card-foreground border-foreground/10 flex flex-col gap-4 rounded-xl border py-4 text-sm shadow-xs has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        // 글래스 카드는 overflow-hidden 을 빼서 backdrop-filter 클립 충돌도 피한다.
        glass ? "glass-surface" : "bg-card overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "bg-muted/50 flex items-center rounded-b-xl border-t p-4 group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
