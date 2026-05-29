import { announcementEmail } from "@/lib/announcement-email";
import { appBaseUrl } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin";
import { PROGRAM_HOURS_BASE } from "@/lib/program-hours";
import AnnouncementClient from "./client";

export const dynamic = "force-dynamic";

export default async function AnnouncementPage() {
  const session = await requireAdmin();
  const baseUrl = appBaseUrl();
  const email = announcementEmail({
    registerUrl: `${baseUrl}/register`,
    schedule: PROGRAM_HOURS_BASE,
    logoUrl: `${baseUrl}/manor-lanes-logo.png`,
  });

  return (
    <>
      <h1 className="text-xl font-medium text-sl-navy">Announcement email</h1>
      <p className="mt-1 text-sm text-sl-navy/60">
        HTML email you can send to your existing Manor Lanes customer list,
        announcing Summer Strikes 2026 is open for registration.
      </p>

      <AnnouncementClient
        subject={email.subject}
        html={email.html}
        text={email.text}
        myEmail={session?.user?.email ?? ""}
        baseUrl={baseUrl}
      />
    </>
  );
}
