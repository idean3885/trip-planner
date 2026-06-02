"use client";

/**
 * #657 — 드래그-팔로우 + 앞뒤 핍 스와이프 캐러셀. shadcn 정식 엔진 embla-carousel.
 *
 * 이전·현재·다음 3슬라이드를 가운데(현재) 정렬로 렌더한다. 손가락을 따라 끌리고,
 * 손을 떼면 가장 가까운 슬라이드로 스냅한다. 옆 슬라이드로 정착하면 onCommit 으로
 * 기준 기간을 한 칸 옮기고(부모 상태), anchorKey 가 바뀌면 가운데로 무애니메이션
 * 복귀한다. 이때 정착 슬라이드(예: 다음)의 내용과 새 가운데(=새 현재=옛 다음)의
 * 내용이 같으므로 점프가 보이지 않는다(seamless 무한 내비).
 *
 * 가로 전용 — embla 가 세로 제스처는 통과시키고, 컨테이너에 touch-pan-y 도 줘
 * 세로 페이지 스크롤을 그대로 둔다(#649 회귀 방지).
 */

import useEmblaCarousel from "embla-carousel-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import { cn } from "@/lib/utils";

// SSR 에서는 useLayoutEffect 경고가 나므로 클라이언트에서만 layout effect 사용.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface SwipeCarouselProps {
  /** 슬라이드 렌더러. offset: -1(이전)·0(현재)·1(다음). */
  renderSlide: (offset: -1 | 0 | 1) => ReactNode;
  /** 옆 슬라이드로 정착하면 호출. dir: 1(다음)·-1(이전). 부모가 기준을 옮긴다. */
  onCommit: (dir: 1 | -1) => void;
  /** 기준이 바뀌면 달라지는 키. 변경 시 가운데로 무애니 복귀한다. */
  anchorKey: string;
  className?: string;
  slideClassName?: string;
  ariaLabel?: string;
}

export function SwipeCarousel({
  renderSlide,
  onCommit,
  anchorKey,
  className,
  slideClassName,
  ariaLabel,
}: SwipeCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: 1,
    align: "center",
    duration: 18,
  });

  // onCommit 은 부모가 매 렌더 새 클로저로 넘기므로 ref 로 최신값을 들고,
  // embla select 핸들러는 stable 하게 유지해 리스너 재등록을 피한다.
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  // 커밋은 select(스냅 목표가 확정되는 즉시)에서 한다. settle(애니 종료 뒤)로
  // 미뤘던 것(#661)을 되돌린 것으로, 이유는 두 가지다(#682·#683):
  //   - 미로딩 날짜로 스와이프해도 데이터 도착·모션 종료를 기다리지 않고 즉시
  //     기준 날짜를 옮겨야 한다(#682). settle 대기 중에는 가운데로 튕겨 보였다.
  //   - 캘린더 선택 강조가 일정 이동과 같은 타이밍에 갱신되어야 한다(#683).
  // #661 의 끊김(무거운 재렌더가 스냅 애니에 끼어듦)은 #673(DayActivitiesPane
  // memo·안정 props·레이아웃 격리)로 재렌더 비용을 줄여 완화됐다.
  const handleSelect = useCallback(() => {
    if (!emblaApi) return;
    const i = emblaApi.selectedScrollSnap();
    if (i === 1) return; // 가운데 — 변화 없음
    onCommitRef.current(i === 2 ? 1 : -1);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", handleSelect);
    return () => {
      emblaApi.off("select", handleSelect);
    };
  }, [emblaApi, handleSelect]);

  // 커밋으로 anchorKey 가 바뀌어 슬라이드가 새 기준으로 재렌더되면, paint 전에
  // 슬라이드 위치를 다시 측정(reInit)하고 가운데로 즉시 복귀(jump=true)한다.
  // 재측정이 없으면 스냅 좌표가 옛 값으로 남아 가운데가 어긋나 이전 슬라이드가
  // 왼쪽에 삐져나온다(#665). reInit 은 settle(모션 종료) 뒤에 일어나므로 넘김
  // 애니메이션 도중 끊김(#661)은 재발하지 않는다.
  useIsoLayoutEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    emblaApi.scrollTo(1, true);
  }, [emblaApi, anchorKey]);

  return (
    <div
      ref={emblaRef}
      className={cn("touch-pan-y overflow-hidden", className)}
      role="group"
      aria-label={ariaLabel}
    >
      {/* will-change-transform 제거(#677) — 합성 레이어 고정이 그 위 텍스트·내용을
          낮은 해상도로 래스터해 흐릿했다. 끊김 완화는 재렌더 축소·레이아웃 격리(#673)로
          처리되므로 합성 고정은 불필요. */}
      <div className="flex">
        {([-1, 0, 1] as const).map((off) => (
          <div
            key={off}
            aria-hidden={off !== 0}
            // contain-layout — 슬라이드별 레이아웃을 격리해 한 칸 변경이 옆 칸
            // 레이아웃 재계산으로 번지지 않게 한다(#673). 색·크기 토큰과 무관.
            className={cn(
              "min-w-0 shrink-0 grow-0 basis-full [contain:layout]",
              slideClassName,
            )}
          >
            {renderSlide(off)}
          </div>
        ))}
      </div>
    </div>
  );
}
