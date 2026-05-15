import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
          role: "PARENT",
        }
      : { role: "PARENT" },
    include: {
      children: true,
      _count: {
        select: { vouchers: { where: { redeemedAt: { not: null } } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-sl-navy">Families</h1>
        <span className="text-sm text-sl-navy/60">{users.length} shown</span>
      </div>

      <form className="mt-4">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, email, or phone…"
          className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        />
      </form>

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-sl-light text-left text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
            <tr>
              <th className="px-4 py-2">Parent</th>
              <th className="px-4 py-2">Children</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">SMS</th>
              <th className="px-4 py-2 text-right">Redeemed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-sl-light/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/families/${u.id}`} className="font-medium text-sl-navy hover:text-sl-red">
                    {u.firstName} {u.lastName}
                  </Link>
                  <div className="text-[11px] text-sl-navy/40">
                    Joined {u.createdAt.toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-3 text-sl-navy">
                  {u.children.length} kid{u.children.length === 1 ? "" : "s"}
                  <div className="text-[11px] text-sl-navy/50">
                    {u.children.map((c) => c.name.split(" ")[0]).join(", ")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sl-navy">{u.email}</div>
                  <div className="text-[11px] text-sl-navy/50">
                    {u.phone ? formatPhone(u.phone) : "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.smsOptIn ? (
                    <span className="rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[11px] font-medium text-[#3B6D11]">
                      On
                    </span>
                  ) : (
                    <span className="rounded-full bg-sl-light px-2 py-0.5 text-[11px] text-sl-navy/50">
                      Off
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sl-navy">
                  {u._count.vouchers}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-sl-navy/60">
            {query ? "No matches." : "No families have registered yet."}
          </div>
        )}
      </div>
    </>
  );
}

function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
