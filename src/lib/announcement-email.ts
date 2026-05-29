// Branded HTML email announcing the Summer Strikes program is live.
// Built with table-based layout + inline CSS for Outlook / Gmail / Apple Mail
// compatibility. Width capped at 600px which is the email standard.

export function announcementEmail(opts: {
  registerUrl: string;
  schedule?: { day: string; hours: string | null }[];
  logoUrl?: string;
}) {
  const { registerUrl, schedule, logoUrl } = opts;
  const navy = "#1a2744";
  const red = "#c8102e";
  const gold = "#f5a623";
  const cream = "#fdfbf7";
  const light = "#f8f6f2";

  const subject = "Introducing Summer Strikes at Manor Lanes — your kids bowl free all summer";

  const hours = schedule ?? DEFAULT_SCHEDULE;

  const text = `New this summer at Manor Lanes — free bowling all summer for your kids.

Register your kids (ages 2-15) for 2 free games of bowling every program day, June 1 through August 31.
Adults 16+ can join with a Family Pass for $49.95/person — also 2 free games per day, all summer.

How it works:
  1. Register your family at ${registerUrl}
  2. Vouchers refresh in your dashboard each morning at 7am
  3. Show your phone at the desk and bowl

Program hours:
${hours.map((h) => `  ${h.day.padEnd(10)} ${h.hours ?? "closed for Summer Strikes"}`).join("\n")}

Standard shoe rental fees still apply.

Register now: ${registerUrl}

— Manor Lanes
`;

  const logoBlock = logoUrl
    ? `<tr>
        <td style="padding:24px 16px 0;text-align:center;">
          <img src="${logoUrl}" alt="Manor Lanes" height="48" style="height:48px;width:auto;display:inline-block;border:0;" />
        </td>
      </tr>`
    : "";

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>Introducing Summer Strikes at Manor Lanes</title>
</head>
<body style="margin:0;padding:0;background:${cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${navy};">
<center style="width:100%;background:${cream};">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:${cream};">

  <!-- Preheader (hidden in body, shown in preview) -->
  <tr>
    <td style="padding:0;mso-line-height-rule:exactly;line-height:1px;font-size:1px;color:${cream};max-height:0;overflow:hidden;">
      Free bowling for kids ages 2–15 all summer. Plus optional Family Pass for adults. June 1 – August 31.
    </td>
  </tr>

  ${logoBlock}

  <!-- Spacer -->
  <tr><td style="padding:${logoBlock ? "16px" : "24px"} 16px 0;"></td></tr>

  <!-- Hero -->
  <tr>
    <td style="padding:0 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${navy};border-radius:16px;">
        <tr>
          <td style="padding:32px 28px 32px;color:#ffffff;">
            <div style="display:inline-block;background:${red};color:#ffffff;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;padding:4px 12px;border-radius:20px;">
              Manor Lanes &middot; New for Summer 2026
            </div>
            <h1 style="margin:14px 0 8px;font-size:30px;line-height:1.15;font-weight:500;color:#ffffff;">
              Summer <span style="color:${gold};">Strikes</span><br/>
              Bowl Free All Summer
            </h1>
            <p style="margin:8px 0 22px;font-size:15px;line-height:1.5;color:#ffffff;opacity:0.85;">
              We&rsquo;re launching a new free summer bowling program for kids.
              Register your kids ages 2&ndash;15 for 2 free games of bowling
              every program day &mdash; all summer long. Add adults 16+ with the
              Family Pass for $49.95/person.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="background:${red};border-radius:8px;">
                  <a href="${registerUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Register now &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- How it works -->
  <tr>
    <td style="padding:24px 16px 0;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${navy};opacity:0.6;">
        How it works
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td valign="top" style="width:33.33%;padding-right:6px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#ffffff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;">
              <tr><td style="padding:18px 14px;text-align:center;">
                <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:${navy};color:#ffffff;font-size:13px;font-weight:600;">1</div>
                <p style="margin:10px 0 4px;font-size:13px;font-weight:600;color:${navy};">Register</p>
                <p style="margin:0;font-size:11px;line-height:1.5;color:${navy};opacity:0.6;">Create a free family account in minutes</p>
              </td></tr>
            </table>
          </td>
          <td valign="top" style="width:33.33%;padding:0 3px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#ffffff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;">
              <tr><td style="padding:18px 14px;text-align:center;">
                <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:${navy};color:#ffffff;font-size:13px;font-weight:600;">2</div>
                <p style="margin:10px 0 4px;font-size:13px;font-weight:600;color:${navy};">Get your pass</p>
                <p style="margin:0;font-size:11px;line-height:1.5;color:${navy};opacity:0.6;">Daily vouchers refresh in your dashboard at 7am</p>
              </td></tr>
            </table>
          </td>
          <td valign="top" style="width:33.33%;padding-left:6px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#ffffff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;">
              <tr><td style="padding:18px 14px;text-align:center;">
                <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:${navy};color:#ffffff;font-size:13px;font-weight:600;">3</div>
                <p style="margin:10px 0 4px;font-size:13px;font-weight:600;color:${navy};">Bowl free</p>
                <p style="margin:0;font-size:11px;line-height:1.5;color:${navy};opacity:0.6;">Show your phone at the desk &mdash; bowl!</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Offer cards -->
  <tr>
    <td style="padding:14px 16px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td valign="top" style="width:50%;padding-right:5px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${light};border:1px solid rgba(0,0,0,0.05);border-radius:14px;">
              <tr><td style="padding:18px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${navy};opacity:0.6;">
                  Kids ages 2–15
                </p>
                <p style="margin:0;font-size:15px;font-weight:600;color:${navy};">
                  Free &middot; 2 games per day
                </p>
              </td></tr>
            </table>
          </td>
          <td valign="top" style="width:50%;padding-left:5px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(245,166,35,0.10);border:1px solid rgba(245,166,35,0.4);border-radius:14px;">
              <tr><td style="padding:18px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${gold};">
                  Family Pass &middot; 16+
                </p>
                <p style="margin:0;font-size:15px;font-weight:600;color:${navy};">
                  $49.95/person &middot; 2 games per day
                </p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Schedule -->
  <tr>
    <td style="padding:14px 16px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#ffffff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;">
        <tr><td style="padding:18px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${navy};opacity:0.6;">
            Program hours
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:14px;">
            ${hours
              .map(
                (h, i) =>
                  `<tr><td style="padding:5px 0;color:${navy};opacity:0.6;${i < hours.length - 1 ? `border-bottom:1px solid rgba(0,0,0,0.05);` : ""}">${h.day}</td><td style="padding:5px 0;text-align:right;color:${navy};${h.hours ? "" : "opacity:0.4;"}${i < hours.length - 1 ? `border-bottom:1px solid rgba(0,0,0,0.05);` : ""}">${h.hours ?? "Closed for Summer Strikes"}</td></tr>`
              )
              .join("")}
          </table>
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Bottom CTA -->
  <tr>
    <td style="padding:20px 16px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${navy};border-radius:14px;">
        <tr>
          <td style="padding:24px 20px;text-align:center;color:#ffffff;">
            <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#ffffff;">
              Ready to bowl free all summer?
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="background:${red};border-radius:8px;">
                  <a href="${registerUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Register your family &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 16px 36px;text-align:center;font-size:11px;line-height:1.6;color:${navy};opacity:0.5;">
      Manor Lanes &middot; Summer Strikes 2026<br/>
      Standard shoe rental fees still apply. Program is for individual family use only;
      not valid for daycare, camp, or group outings.<br/>
      <a href="${registerUrl.replace(/\/?$/, "")}/faq" style="color:${navy};">FAQ</a>
    </td>
  </tr>

</table>
</center>
</body>
</html>`;

  return { subject, html, text };
}

const DEFAULT_SCHEDULE = [
  { day: "Monday", hours: null },
  { day: "Tuesday", hours: "11:00am – 5:00pm" },
  { day: "Wednesday", hours: "11:00am – 5:00pm" },
  { day: "Thursday", hours: "11:00am – 10:00pm" },
  { day: "Friday", hours: "4:00pm – 6:00pm" },
  { day: "Saturday", hours: "11:00am – 5:00pm" },
  { day: "Sunday", hours: null },
];
