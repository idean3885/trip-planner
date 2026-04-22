import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rolesFor, type RoleBadgeTone } from "@/lib/member-role";

interface MemberListProps {
  tripId: number;
}

const ROLE_ORDER: Record<string, number> = { OWNER: 0, HOST: 1, GUEST: 2 };

const BADGE_BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1";

function badgeClass(tone: RoleBadgeTone) {
  if (tone === "primary") return `${BADGE_BASE} bg-foreground text-background ring-transparent`;
  if (tone === "secondary") return `${BADGE_BASE} bg-secondary text-secondary-foreground ring-foreground/10`;
  return `${BADGE_BASE} bg-muted text-muted-foreground ring-foreground/5`;
}

export default async function MemberList({ tripId }: MemberListProps) {
  const members = await prisma.tripMember.findMany({
    where: { tripId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  const sorted = [...members].sort((a, b) => {
    const byRole = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
    if (byRole !== 0) return byRole;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>동행자 ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sorted.map((m) => {
            const displayName = m.user.name || m.user.email || "이름 없음";
            return (
              <li key={m.id} className="flex items-center gap-3">
                {m.user.image ? (
                  <Image
                    src={m.user.image}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                    {displayName[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </p>
                  {m.user.email && m.user.name && (
                    <p className="truncate text-xs text-muted-foreground">
                      {m.user.email}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {rolesFor(m.role).map((b) => (
                    <span key={b.key} className={badgeClass(b.tone)}>
                      {b.label}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
