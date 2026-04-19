import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ToastTriggers } from "./ToastTriggers";
import ActivityCard from "@/components/ActivityCard";
import { sampleActivity, sampleActivityAlt } from "./_samples";

export const metadata = {
  title: "Components Preview",
  robots: { index: false, follow: false },
};

export default function ComponentsPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-12 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Components Preview</h1>
        <p className="text-muted-foreground">
          shadcn/ui 초기 셋 (v2.4.3 기반). 개발 환경 전용. 디자이너 검수용.
        </p>
      </header>

      <PreviewSection title="Button" description="variant × size 매트릭스">
        <div className="flex flex-wrap gap-2">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button size="default">Default</Button>
          <Button size="lg">LG</Button>
        </div>
      </PreviewSection>

      <PreviewSection title="Input / Label" description="단일 입력 + 레이블">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="preview-input">이름</Label>
          <Input id="preview-input" placeholder="여행 이름을 입력하세요" />
        </div>
      </PreviewSection>

      <PreviewSection title="Field" description="Form 레이아웃(base-nova의 form 대체)">
        <Field>
          <FieldLabel htmlFor="preview-field-input">이메일</FieldLabel>
          <Input id="preview-field-input" type="email" placeholder="you@example.com" />
          <FieldDescription>초대 발송용 이메일입니다.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="preview-field-error">비밀번호</FieldLabel>
          <Input id="preview-field-error" type="password" aria-invalid />
          <FieldError>최소 8자 이상이어야 합니다.</FieldError>
        </Field>
      </PreviewSection>

      <PreviewSection title="Card" description="레이아웃 컨테이너">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>바르셀로나 3박 4일</CardTitle>
            <CardDescription>6월 16일 ~ 20일 · 4박 5일</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">시로코·사그라다파밀리아·구엘공원 등 주요 관광지 일정.</p>
          </CardContent>
          <CardFooter>
            <Button size="sm">상세 보기</Button>
          </CardFooter>
        </Card>
      </PreviewSection>

      <PreviewSection title="Dialog" description="모달 다이얼로그">
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline">다이얼로그 열기</Button>}
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>여행 삭제 확인</DialogTitle>
              <DialogDescription>
                이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">취소</Button>
              <Button variant="destructive">삭제</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PreviewSection>

      <PreviewSection title="Dropdown Menu" description="컨텍스트 메뉴">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline">메뉴</Button>}
          />
          <DropdownMenuContent>
            <DropdownMenuLabel>작업</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>편집</DropdownMenuItem>
            <DropdownMenuItem>복제</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PreviewSection>

      <PreviewSection title="Select" description="단일 선택">
        <div className="max-w-xs">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sightseeing">관광</SelectItem>
              <SelectItem value="food">식사</SelectItem>
              <SelectItem value="transport">이동</SelectItem>
              <SelectItem value="accommodation">숙소</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PreviewSection>

      <PreviewSection title="Tabs" description="탭 네비게이션">
        <Tabs defaultValue="schedule" className="max-w-md">
          <TabsList>
            <TabsTrigger value="schedule">일정</TabsTrigger>
            <TabsTrigger value="members">멤버</TabsTrigger>
            <TabsTrigger value="budget">예산</TabsTrigger>
          </TabsList>
          <TabsContent value="schedule" className="pt-4">
            <p className="text-sm">날짜별 활동 목록이 여기에 표시됩니다.</p>
          </TabsContent>
          <TabsContent value="members" className="pt-4">
            <p className="text-sm">동행자 목록이 여기에 표시됩니다.</p>
          </TabsContent>
          <TabsContent value="budget" className="pt-4">
            <p className="text-sm">비용 집계가 여기에 표시됩니다.</p>
          </TabsContent>
        </Tabs>
      </PreviewSection>

      <PreviewSection title="Skeleton" description="로딩 플레이스홀더">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-8 w-full max-w-sm" />
        </div>
      </PreviewSection>

      <PreviewSection title="Sonner (Toast)" description="토스트 알림">
        <ToastTriggers />
      </PreviewSection>

      <PreviewSection title="Separator" description="구분선">
        <div className="space-y-3">
          <p className="text-sm">섹션 A</p>
          <Separator />
          <p className="text-sm">섹션 B</p>
          <div className="flex items-center gap-3">
            <span className="text-sm">왼쪽</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm">오른쪽</span>
          </div>
        </div>
      </PreviewSection>

      <PreviewSection
        title="ActivityCard (Phase 2)"
        description="스펙 013 T005로 shadcn <Card> 전환. canEdit true 샘플 + false 샘플."
      >
        <div className="space-y-3">
          <ActivityCard activity={sampleActivity} canEdit />
          <ActivityCard activity={sampleActivityAlt} canEdit isLast />
          <ActivityCard activity={sampleActivity} />
        </div>
      </PreviewSection>

      <PreviewSection
        title="Migrated Forms (PR3)"
        description="v2.4.3에서 shadcn/ui 기반으로 마이그레이션된 기존 폼 6종. 실제 동작 확인은 연결된 도메인 플로우에서 수행."
      >
        <ul className="space-y-2 text-sm">
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ActivityForm</code>{" "}
            — 여행 활동 생성/수정. 경로:{" "}
            <code className="text-muted-foreground">/trips/[id]/day/[dayId]</code> (활동 목록에서
            &quot;+ 추가&quot; 클릭)
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AuthButton</code> — 모든 페이지
            상단 헤더 (설정·로그아웃)
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DeleteTripButton</code> /{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">LeaveTripButton</code> — 여행
            상세 페이지 하단 (Dialog 사용)
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">InviteButton</code> — 여행
            상세에서 호스트가 노출. toast로 복사 피드백
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">TodayButton</code> — 여행
            상세에서 오늘 일정이 있을 때 표시
          </li>
        </ul>
      </PreviewSection>
    </div>
  );
}

function PreviewSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4 rounded-lg border p-4">{children}</div>
    </section>
  );
}

