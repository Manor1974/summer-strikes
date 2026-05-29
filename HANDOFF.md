# Summer Strikes — Session Handoff

**Last worked:** 2026-05-28 evening
**Status:** Launch-ready except Stripe live mode + a few FRONTDESK1 deploys.
**Target launch:** Email announcement Friday morning (2026-05-29) → June 1 program start.

---

## 🚨 Critical pre-launch checklist (tomorrow morning, before email blast)

### 1. Switch Stripe to live mode (5 min)

Right now `STRIPE_SECRET_KEY` in Vercel is a `sk_test_...` key. Real Family Pass purchases will fail.

- **Stripe Dashboard** → toggle out of Sandbox/Test mode (top right)
- **Developers → API keys** → copy the live secret key (`sk_live_...`)
- **Vercel → Project → Settings → Environment Variables**:
  - `STRIPE_SECRET_KEY` → paste live key
- **Stripe Dashboard → Developers → Webhooks → + Add endpoint** (LIVE mode, separate from test webhook):
  - URL: `https://summer.manorlanes.com/api/stripe/webhook`
  - Events: `checkout.session.completed`, `checkout.session.expired`
  - Copy signing secret → paste into Vercel `STRIPE_WEBHOOK_SECRET`
- Vercel auto-redeploys (~1 min)

### 2. Test one real Family Pass purchase

- Register fresh family at `summer.manorlanes.com/register` with 1 Family Pass adult ($49.95)
- Pay with YOUR real card
- Verify the charge in **Stripe → Payments (LIVE mode)**
- Verify the adult shows up in admin within seconds (webhook fired)
- **Refund the test charge** from the same Stripe dashboard
- If anything breaks, do not send the announcement email until fixed

### 3. THEN send the announcement email

`summer.manorlanes.com/admin/announcement`:
- Click **Send test to brian@manorlanes.com** first → confirm it renders correctly in Gmail
- Then either:
  - **Copy HTML** → paste into Mailchimp / Klaviyo / whatever holds your customer list (recommended — better deliverability + unsubscribe handling)
  - OR paste customer emails directly and click **Send announcement to list** (Resend sends serially)

---

## ✅ What works end-to-end right now

- **Registration**: free for kids, $49.95/Family Pass adult via Stripe Checkout, welcome email + SMS, family reservation code generated
- **Dashboard**: kids + adults listed with bowler IDs + reservation code, today's vouchers with QR codes, "Show at desk" big-screen view, SMS preferences, live lane availability widget
- **QR redemption flow**: parent shows QR → staff scans with iPhone camera → opens `/redeem/<voucherId>` → admin taps "Mark redeemed"
- **Add-child-from-admin with instant QR**: parent calls and wants to add a new kid; admin adds it via `/admin/families/[id]`, voucher generates immediately, QR shows inline for staff to scan
- **Self-serve password reset** (no admin involvement)
- **Staff guide PDF** at `/admin/staff-guide` — Print/Save as PDF
- **Announcement email** at `/admin/announcement` with preview, send-to-self, copy HTML, broadcast-to-list
- **Admin staff accounts** at `/admin/staff` — create staff/admin without dummy kids
- **30-day rolling sessions** so the desk iPad stays logged in all summer

## 🛠️ Deferred items (not blocking June 1, useful afterwards)

### FRONTDESK1 lane availability poller (35 min stale as of last check)

The lane availability widget on the parent dashboard reads from `manorlanes.com/lm/data/lane-availability.json`, which is updated by `lane-availability-poller.ps1` on FRONTDESK1. **That poller hasn't fired in 35+ min** despite Task Scheduler showing it's configured every minute.

**Last debug step before stopping:** asked Brian to run the script manually on FRONTDESK1 and check `lane-poller.log` to find out whether it's:
- SQL error (DB unreachable / perms broken)
- POST error (network out from FRONTDESK1 blocked, or password mismatch)
- "Run only when user is logged on" with no one logged in
- "Start in" Actions field wrong, so `$PSScriptRoot` resolves wrong

See `src/lib/lane-availability.ts` for our cache (30s — so once poller fires, dashboard reflects within 30s). Once poller is fixed, dashboard widget gets fresh data automatically.

### Conqueror FBT auto-POST (PHP receiver ready, not yet deployed)

Built but inactive:
- `manorlanes-lm/summer-strikes-receiver.php` — ready to deploy to `manorlanes.com/lm/` (same folder as the existing receivers)
- Vercel env vars to set:
  - `FBT_RECEIVER_URL` = `https://manorlanes.com/lm/summer-strikes-receiver.php`
  - `FBT_RECEIVER_PASSWORD` = `Manor1974LaneZ` (matches the other receivers' pattern)
- After deploy: hit `/admin/conqueror` → "Re-sync all bowlers" to backfill the receiver's pending JSON with current 3 bowlers

After receiver deploy, need a FRONTDESK1 PowerShell script that:
1. GETs `manorlanes.com/lm/data/summer-strikes-pending.json`
2. For each entry, builds a one-person FBT.xml (pattern in `src/lib/fbt-export.ts`)
3. Drops into Conqueror's FBT import folder (typically `C:\Program Files (x86)\QubicaAMF\Conqueror\Imports\` — verify path on FRONTDESK1)
4. POSTs back to a new `/lm/summer-strikes-processed-receiver.php` to ack

Workaround until that's built: hit `/admin/conqueror` → **Download FBT.xml** → manually drop into FBT import folder.

### Larger projects (post-launch)

- **Bowl Anytime league** — separate league app w/ standings + leaders. Pattern: existing league apps under `manorlanes.com/leagues/notap/` etc. Probably 3-6 weeks of work.
- **Conqueror reservation system** (replace mybowlingpassport) — full aspiration documented in `/Users/brian/Library/Mobile Documents/com~apple~CloudDocs/Mobile League Stats App/lm/_session_handoff_2026-05-24_conqueror_portal/00-SESSION-HANDOFF.md` under "🎯 Conqueror reservation system" section.

---

## 🧠 What lives where

| Thing | Location |
|---|---|
| **App repo** | `/Users/brian/Library/CloudStorage/Dropbox/Summer Strikes Program/` + `github.com/Manor1974/summer-strikes` |
| **Production URL** | `https://summer.manorlanes.com` |
| **Vercel project** | `summer-strikes` under manor1974 |
| **Database** | Neon Postgres — `ep-jolly-mountain-aj5i09jo` |
| **Stripe** | Currently TEST mode keys in Vercel. Swap to LIVE before launch (see step 1 above) |
| **Twilio** | A2P 10DLC approved. SMS works. |
| **Resend** | API key in Vercel. Sender domain `manorlanes.com` verified. |
| **WP receivers (lm/)** | `/Users/brian/Library/Mobile Documents/com~apple~CloudDocs/Mobile League Stats App/lm/app/` — drop `summer-strikes-receiver.php` here when ready |
| **FRONTDESK1 pollers** | `/Users/brian/Library/CloudStorage/Dropbox/conqueror-portal-poller/` — also has `discover-reservations*.sql` (in-flight schema mapping for the future Conqueror reservation system) |
| **Bowling portal handoff** | `/Users/brian/Library/Mobile Documents/com~apple~CloudDocs/Mobile League Stats App/lm/_session_handoff_2026-05-24_conqueror_portal/00-SESSION-HANDOFF.md` (has the reservation aspiration write-up) |
| **Logo files** | `public/manor-lanes-logo.svg` + `.png` in the repo |

## 📋 In-progress when we stopped

- FRONTDESK1 lane poller debugging — Brian to run script manually tomorrow and report output
- Stripe still in test mode — needs live-mode swap before email blast
- `summer-strikes-receiver.php` written but not yet deployed to `/lm/`
- Vercel `FBT_RECEIVER_URL` + `FBT_RECEIVER_PASSWORD` not yet set

## 📞 Quick credentials (already in `.env.local`)

| Var | Value |
|---|---|
| `ADMIN_EMAILS` | `brian@manorlanes.com, bjrusso14@gmail.com` |
| `FBT_RECEIVER_PASSWORD` (to set) | `Manor1974LaneZ` |
| Brian's reservation code | `5252FH` |
| Brian's bowler ID | 1002 (adult, Family Pass) |
| Evan's bowler ID | 1000 |
| Dylan's bowler ID | 1001 |
