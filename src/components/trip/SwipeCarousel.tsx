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
  /**
   * spec 043 US4 — 트랙 높이를 현재(가운데) 슬라이드 높이에 맞춘다. flex 트랙은
   * 기본적으로 가장 큰 슬라이드 높이를 가져, 짧은 현재 날 아래에 긴 이웃 날만큼
   * 빈 스크롤이 남았다(#723). 켜면 현재 슬라이드만 높이를 결정한다.
   */
  syncHeight?: boolean;
}

export function SwipeCarousel({
  renderSlide,
  onCommit,
  anchorKey,
  className,
  slideClassName,
  ariaLabel,
  syncHeight,
}: SwipeCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: 1,
    align: "center",
    duration: 18,
  });
  const trackRef = useRef<HTMLDivElement>(null);
  const activeSlideRef = useRef<HTMLDivElement>(null);

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

  // spec 043 US4 — 트랙 높이를 현재 슬라이드에 맞춘다. 긴 이웃(핍) 슬라이드는
  // 외곽 overflow-hidden 으로 잘려 빈 스크롤이 생기지 않는다. 활성 슬라이드 내용이
  // 바뀌면(활동 CRUD·날짜 이동) ResizeObserver 가 다시 맞춘다.
  useIsoLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // #956 — syncHeight 가 꺼지면 인라인 height 를 비운다. 캘린더 월↔주 전환은
    // 같은 SwipeCarousel 인스턴스를 재사용해(같은 타입·같은 위치) 트랙 DOM 이
    // 유지되므로, 월 뷰(syncHeight=on)에서 고정한 인라인 height 가 주 뷰로 넘어와
    // 주간 한 줄 아래 월 높이만큼 빈 영역이 남던 회귀. 끄면 콘텐츠 높이로 되돌린다.
    if (!syncHeight) {
      track.style.height = "";
      return;
    }
    const active = activeSlideRef.current;
    if (!active) return;
    const apply = () => {
      track.style.height = `${active.offsetHeight}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(active);
    return () => ro.disconnect();
  }, [syncHeight, anchorKey]);

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
      {/* spec 040 — items-start 로 각 슬라이드가 자기 콘텐츠 높이를 갖게 한다.
          stretch(기본)면 짧은 현재 슬라이드가 옆 긴 슬라이드 높이로 늘어나 빈
          스크롤이 남는다(이미지 #12). */}
      <div ref={trackRef} className="flex items-start">
        {([-1, 0, 1] as const).map((off) => (
          <div
            key={off}
            ref={off === 0 ? activeSlideRef : undefined}
            aria-hidden={off !== 0}
            // contain-layout — 슬라이드별 레이아웃을 격리해 한 칸 변경이 옆 칸
            // 레이아웃 재계산으로 번지지 않게 한다(#673). 색·크기 토큰과 무관.
            // #960 — 화면 밖 peek 슬라이드에만 가로 1px 인셋을 줘, 다음 슬라이드
            // 카드의 좌측 테두리가 overflow-hidden 우측 클립 경계에 맞닿아 서브픽셀로
            // 새어 나오던 희미한 세로선을 없앤다. 활성(off===0)은 그대로 두어 정렬·
            // 너비 불변. 드래그 중 잠깐 보이는 1px 여백은 인지 불가.
            className={cn(
              "min-w-0 shrink-0 grow-0 basis-full [contain:layout]",
              off !== 0 && "px-px",
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
