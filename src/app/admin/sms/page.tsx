import { prisma } from "@/lib/prisma";
import SmsBroadcastForm from "./form";

export default async function AdminSmsPage() {
  const recipients = await prisma.user.count({
    where: { smsOptIn: true, phone: { not: null } },
  });

  return (
    <>
      <h1 className="text-xl font-medium text-sl-navy">SMS broadcast</h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        Send a message to all opted-in Summer Strikes families.{" "}
        <span className="font-medium text-sl-navy">{recipients}</span> recipients.
      </p>

      <div className="mt-2 rounded-md bg-sl-gold/10 px-4 py-3 text-xs text-sl-navy/80">
        <strong>TCPA reminder:</strong> only send messages related to the
        Summer Strikes program (voucher reminders, schedule changes, event
        announcements). &ldquo;Reply STOP to opt out.&rdquo; is appended
        automatically.
      </div>

      <SmsBroadcastForm recipients={recipients} />
    </>
  );
}
