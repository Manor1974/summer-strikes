import "server-only";
import { hoursForDate } from "./program-hours";

// Manor Lanes' own lane-availability feed, published by
// lane-availability-poller.ps1 on FRONTDESK1 every minute. The poller writes
// /lm/data/lane-availability.json on manorlanes.com via
// lane-availability-receiver.php. We read that JSON directly — single source
// of truth shared with the main Manor Lanes hours widget.
//
// Format published by the poller:
// {
//   "updated_at": "2026-05-28T20:59:13-04:00",
//   "lanes_total": 24,
//   "lanes_available_now": 23,
//   "lanes_in_use": 1,
//   "currently_open": true
// }

const FEED_URL = "https://manorlanes.com/lm/data/lane-availability.json";

export type LaneStatus =
  | {
      status: "open_now";
      lanesOpen: number;
      lanesTotal: number;
      opensAt: string;
      closesAt: string;
      updatedAt: string;
    }
  | { status: "opens_later_today"; opensAt: string; closesAt: string }
  | { status: "closed_today"; nextOpenLabel: string | null }
  | { status: "unknown" };

// ET wall-clock parts (year, month, day, hour, minute, weekday) via Intl —
// safer than the toLocaleString → new Date round-trip which depends on
// locale string parsing and the server's local timezone.
type EtParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=Sun, 6=Sat
};

function nowET(): EtParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date());
  const get = (t: string) =>
    parts.find((p) => p.type === t)?.value ?? "0";
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const weekdayShort = (parts.find((p) => p.type === "weekday")?.value ?? "")
    .toLowerCase()
    .slice(0, 3);
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24, // 24h format
    minute: parseInt(get("minute"), 10),
    dayOfWeek: dayNames.indexOf(weekdayShort),
  };
}

// Construct a Date representing midnight ET on the given ET date, for use
// with hoursForDate / isOpenSaturday which need a JS Date.
function etDateAsLocalDate(p: EtParts): Date {
  return new Date(p.year, p.month - 1, p.day);
}

function parseTime12(label: string): number {
  // "5:00pm" → 17*60+0 = 1020
  const m = label.toLowerCase().match(/^(\d{1,2}):?(\d{0,2})\s*(am|pm)$/);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || "0", 10);
  if (m[3] === "pm" && h !== 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return h * 60 + min;
}

type ProgramWindow = {
  isToday: true;
  openLabel: string;
  closeLabel: string;
  openMins: number;
  closeMins: number;
} | {
  isToday: false;
  nextOpenLabel: string | null;
};

// Today's hours window in ET wall-clock minutes, or fallback "next open day".
function programWindowToday(et: EtParts): ProgramWindow {
  const today = etDateAsLocalDate(et);
  const todayHours = hoursForDate(today);
  if (todayHours) {
    const [openLabel, closeLabel] = todayHours.split("–").map((s) => s.trim());
    return {
      isToday: true,
      openLabel,
      closeLabel,
      openMins: parseTime12(openLabel),
      closeMins: parseTime12(closeLabel),
    };
  }
  // Scan up to 14 days ahead for next open day
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (hoursForDate(d)) {
      const [openLabel] = (hoursForDate(d) || "").split("–").map((s) => s.trim());
      return {
        isToday: false,
        nextOpenLabel: `${dayNames[d.getDay()]} at ${openLabel}`,
      };
    }
  }
  return { isToday: false, nextOpenLabel: null };
}

type Feed = {
  updated_at?: string;
  lanes_total?: number;
  lanes_available_now?: number;
  lanes_in_use?: number;
  currently_open?: boolean;
};

// If the poller hasn't updated the feed in this many minutes, we treat
// the data as untrustworthy and show "unavailable" instead of stale info.
const STALE_THRESHOLD_MIN = 10;

export async function getLaneStatus(): Promise<LaneStatus> {
  // Gate by our own hours first — Manor Lanes' lane poller always sends
  // currently_open=true (it just reports the raw lane count regardless of
  // business hours). The truthful "are we open right now" comes from our
  // program-hours.ts which knows the real Mon-Fri 5-11pm + select Saturdays
  // schedule.
  const et = nowET();
  const window = programWindowToday(et);
  if (!window.isToday) {
    return { status: "closed_today", nextOpenLabel: window.nextOpenLabel };
  }
  const nowMins = et.hour * 60 + et.minute;
  if (nowMins < window.openMins) {
    return {
      status: "opens_later_today",
      opensAt: window.openLabel,
      closesAt: window.closeLabel,
    };
  }
  if (nowMins >= window.closeMins) {
    return { status: "closed_today", nextOpenLabel: null };
  }

  // We're within today's open window — fetch live lane count.
  // CACHE-BUST: Cloudflare in front of Kinsta serves /lm/data/*.json with
  // `Cache-Control: public, max-age=31536000` (1 year) — even after the
  // PHP receiver writes a fresh file, CF keeps serving stale until the
  // cached URL expires or we change the URL. Until the .htaccess fix on
  // the Kinsta side lands (task #23), we vary the URL every 30s so CF
  // misses and refetches from origin. Vercel's data cache still works
  // within each 30s window because the URL is identical for that bucket.
  const bucket = Math.floor(Date.now() / 30_000);
  try {
    const res = await fetch(`${FEED_URL}?t=${bucket}`, {
      next: { revalidate: 30, tags: ["lane-availability"] },
    });
    if (!res.ok) return { status: "unknown" };
    const feed = (await res.json()) as Feed;
    if (typeof feed.lanes_available_now !== "number") {
      return { status: "unknown" };
    }
    const updatedAt = feed.updated_at ?? new Date().toISOString();
    // Reject stale data — if FRONTDESK1's poller is down, show "unavailable"
    // rather than a fake stale lane count.
    const ageMs = Date.now() - new Date(updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > STALE_THRESHOLD_MIN * 60 * 1000) {
      return { status: "unknown" };
    }
    return {
      status: "open_now",
      lanesOpen: feed.lanes_available_now,
      lanesTotal: feed.lanes_total ?? 24,
      opensAt: window.openLabel,
      closesAt: window.closeLabel,
      updatedAt,
    };
  } catch {
    return { status: "unknown" };
  }
}

// Pretty-printer for the dashboard pill. The dashboard renders a neutral
// gray pill — the tone here drives just the small status dot, not the
// background.
export function laneStatusLabel(s: LaneStatus): {
  text: string;
  sub: string | null;
  tone: "green" | "amber" | "red" | "gray";
} {
  if (s.status === "open_now") {
    const tone: "green" | "amber" = s.lanesOpen === 0 ? "amber" : "green";
    const base = `We have open lanes today from ${s.opensAt} until ${s.closesAt}`;
    const text =
      s.lanesOpen === 0
        ? `${base} · no lanes free right now`
        : `${base} · ${s.lanesOpen} of ${s.lanesTotal} lane${s.lanesTotal === 1 ? "" : "s"} available now`;
    return { text, sub: relativeAgo(s.updatedAt), tone };
  }
  if (s.status === "opens_later_today") {
    return {
      text: `We have open lanes today from ${s.opensAt} until ${s.closesAt}`,
      sub: null,
      tone: "green",
    };
  }
  if (s.status === "closed_today") {
    return {
      text: s.nextOpenLabel
        ? `Closed today · opens ${s.nextOpenLabel}`
        : "Closed for Summer Strikes today",
      sub: null,
      tone: "red",
    };
  }
  return {
    text: "Lane availability unavailable",
    sub: "updates every 5 min",
    tone: "gray",
  };
}

function relativeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "live";
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 90) return "updated just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `updated ${hours} hr ago`;
}
