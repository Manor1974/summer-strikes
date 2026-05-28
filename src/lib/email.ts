import "server-only";
import { Resend } from "resend";
import { appBaseUrl } from "./stripe";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "Summer Strikes at Manor Lanes <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    console.warn("[resend] No API key set — would have sent:", { to, subject });
    return { skipped: true } as const;
  }
  const result = await resend.emails.send({ from: FROM, to, subject, html, text });
  return result;
}

// Shared branded email shell used by all transactional emails. Uses Manor Lanes
// logo when /public/manor-lanes-logo.png is present (otherwise alt text shows).
function emailShell(opts: { preheader?: string; body: string }) {
  const baseUrl = appBaseUrl();
  const logoUrl = `${baseUrl}/manor-lanes-logo.png`;
  const navy = "#1a2744";
  const gold = "#f5a623";
  const cream = "#fdfbf7";
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
</head>
<body style="margin:0;padding:0;background:${cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${navy};">
<center style="width:100%;background:${cream};">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${cream};">${opts.preheader}</div>` : ""}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:${cream};">

  <!-- Branded header bar -->
  <tr>
    <td style="padding:20px 24px 8px;border-bottom:1px solid rgba(26,39,68,0.08);">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td valign="middle">
            <img src="${logoUrl}" alt="Manor Lanes" height="36" style="height:36px;width:auto;display:block;border:0;" />
          </td>
          <td valign="middle" align="right" style="font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${navy};opacity:0.6;">
            Summer <span style="color:${gold};">Strikes</span> 2026
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body content -->
  <tr>
    <td style="padding:28px 24px 8px;">
      ${opts.body}
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 24px 32px;text-align:center;font-size:11px;line-height:1.6;color:${navy};opacity:0.55;border-top:1px solid rgba(26,39,68,0.08);">
      Manor Lanes &middot; Summer Strikes 2026<br/>
      Standard shoe rental fees still apply.<br/>
      <a href="${baseUrl}/faq" style="color:${navy};">FAQ</a>
    </td>
  </tr>

</table>
</center>
</body>
</html>`;
}

export function welcomeEmail(
  firstName: string,
  kidsCount: number,
  pendingAdultCount: number = 0
) {
  const baseUrl = appBaseUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;
  const subject = `Welcome to Summer Strikes at Manor Lanes, ${firstName}!`;
  const greeting = `Hi ${firstName},`;
  const kidsLine = `${kidsCount === 1 ? "Your child is" : `Your ${kidsCount} children are`} registered for Summer Strikes 2026 at Manor Lanes.`;
  const adultsLine = pendingAdultCount > 0
    ? `We also see you're adding ${pendingAdultCount} Family Pass member${pendingAdultCount === 1 ? "" : "s"} (age 16+). Once your payment is complete, they'll get daily vouchers too.`
    : "";

  const text = `${greeting}

${kidsLine}${adultsLine ? "\n\n" + adultsLine : ""}

How it works:
1. Vouchers refresh in your dashboard each morning at 7am (2 free games per member)
2. Show your phone at the desk before bowling — staff will scan a QR code
3. Standard shoe rental fees still apply

Log in anytime: ${dashboardUrl}

— Manor Lanes`;

  const body = `<p style="margin:0 0 12px;font-size:15px;">${greeting}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${kidsLine}</p>
${adultsLine ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${adultsLine}</p>` : ""}

<h2 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#1a2744;opacity:0.6;margin:24px 0 10px;">How it works</h2>
<ol style="padding-left:20px;line-height:1.65;font-size:14px;margin:0 0 20px;">
  <li>Vouchers refresh each morning at 7am &mdash; 2 free games per member, per day</li>
  <li>Show your phone at the desk before bowling &mdash; staff scans a QR code</li>
  <li>Standard shoe rental fees still apply</li>
</ol>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin:8px 0 16px;">
  <tr><td style="background:#c8102e;border-radius:8px;">
    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View your dashboard &rarr;</a>
  </td></tr>
</table>`;

  return {
    subject,
    text,
    html: emailShell({ preheader: kidsLine, body }),
  };
}

export function familyPassActiveEmail(
  firstName: string,
  adultNames: string[],
  amountDollars: string
) {
  const baseUrl = appBaseUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;
  const subject = `Your Manor Lanes Family Pass is active`;
  const list = adultNames.join(", ");
  const plural = adultNames.length === 1 ? "" : "s";

  const text = `Hi ${firstName},

Your Family Pass payment was received (${amountDollars} for ${adultNames.length} adult${plural}). The following member${plural} now have daily vouchers along with your kids:

${list}

View your dashboard: ${dashboardUrl}

Thanks — Manor Lanes`;

  const body = `<p style="margin:0 0 12px;font-size:15px;">Hi ${firstName},</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Your payment was received (${amountDollars} for ${adultNames.length} adult${plural}). The following member${plural} now have daily Summer Strikes vouchers along with your kids:</p>
<ul style="padding-left:20px;line-height:1.7;font-size:14px;margin:0 0 20px;">
  ${adultNames.map((n) => `<li>${n}</li>`).join("")}
</ul>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin:8px 0 16px;">
  <tr><td style="background:#c8102e;border-radius:8px;">
    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View your dashboard &rarr;</a>
  </td></tr>
</table>`;

  return {
    subject,
    text,
    html: emailShell({ preheader: "Family Pass active — bowl free all summer.", body }),
  };
}
