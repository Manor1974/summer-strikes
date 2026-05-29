import { prisma } from "@/lib/prisma";
import AddStaffForm from "./add-staff-form";
import StaffRow from "./staff-row";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <>
      <h1 className="text-xl font-medium text-sl-navy">Staff accounts</h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        Admins can do everything (manage staff, broadcast SMS, edit family
        details). Staff can scan QR codes and redeem vouchers from the desk
        iPad. Sessions last 30 days on logged-in devices.
      </p>

      <section className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-sl-navy">Add a staff account</h2>
        <AddStaffForm />
      </section>

      <section className="mt-6">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
          Current staff ({staff.length})
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-sl-light text-left text-[11px] font-medium uppercase tracking-wider text-sl-navy/60">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Added</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {staff.map((u) => (
                <StaffRow
                  key={u.id}
                  user={{
                    id: u.id,
                    email: u.email,
                    name: `${u.firstName} ${u.lastName}`,
                    role: u.role,
                    createdAt: u.createdAt.toLocaleDateString(),
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
