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

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
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

  // 커밋은 select(스냅 목표가 바뀌는 즉시 — 드래그 도중에도 발생)가 아니라
  // settle(스냅 애니메이션이 완전히 멈춘 뒤)에서 한다. 무거운 재렌더가 스냅
  // 애니메이션 도중에 끼어들어 프레임이 끊기던 것을 모션이 끝난 뒤로 미룬다(#661).
  const handleSettle = useCallback(() => {
    if (!emblaApi) return;
    const i = emblaApi.selectedScrollSnap();
    if (i === 1) return; // 가운데 — 변화 없음
    onCommitRef.current(i === 2 ? 1 : -1);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("settle", handleSettle);
    return () => {
      emblaApi.off("settle", handleSettle);
    };
  }, [emblaApi, handleSettle]);

  // 커밋으로 anchorKey 가 바뀌어 슬라이드가 새 기준으로 재렌더되면, paint 전에
  // 가운데로 즉시 복귀(jump=true)해 점프가 보이지 않게 한다. 슬라이드 크기·개수는
  // 그대로라 reInit(전체 재측정, 비용 큼)은 불필요 — scrollTo 만으로 충분(#661).
  useIsoLayoutEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(1, true);
  }, [emblaApi, anchorKey]);

  return (
    <div
      ref={emblaRef}
      className={cn("touch-pan-y overflow-hidden", className)}
      role="group"
      aria-label={ariaLabel}
    >
      {/* will-change-transform — 트랙을 합성 레이어로 올려 드래그/스냅을 GPU 에서
          처리해 끊김을 줄인다(#661). */}
      <div className="flex will-change-transform">
        {([-1, 0, 1] as const).map((off) => (
          <div
            key={off}
            aria-hidden={off !== 0}
            className={cn("min-w-0 shrink-0 grow-0 basis-full", slideClassName)}
          >
            {renderSlide(off)}
          </div>
        ))}
      </div>
    </div>
  );
}
