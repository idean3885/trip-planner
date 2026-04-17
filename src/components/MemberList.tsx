import Image from "next/image";
import { prisma } from "@/lib/prisma";

interface MemberListProps {
  tripId: number;
}

const ROLE_ORDER: Record<string, number> = { OWNER: 0, HOST: 1, GUEST: 2 };

function roleBadge(role: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (role) {
    case "OWNER":
      return `${base} bg-primary-100 text-primary-700`;
    case "HOST":
      return `${base} bg-surface-200 text-surface-700`;
    default:
      return `${base} bg-surface-100 text-surface-500`;
  }
}

function roleLabel(role: string) {
  if (role === "OWNER") return "주인";
  if (role === "HOST") return "호스트";
  return "게스트";
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
    <section className="rounded-card shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-heading-sm font-semibold">동행자 ({members.length})</h2>
      </div>
      <ul className="space-y-2">
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
                <div className="h-8 w-8 rounded-full bg-surface-200 flex items-center justify-center text-sm text-surface-500">
                  {displayName[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-surface-900 truncate">
                  {displayName}
                </p>
                {m.user.email && m.user.name && (
                  <p className="text-xs text-surface-500 truncate">{m.user.email}</p>
                )}
              </div>
              <span className={roleBadge(m.role)}>{roleLabel(m.role)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
