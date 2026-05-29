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
      closesAt: string | null;
      updatedAt: string;
    }
  | { status: "opens_later_today"; opensAt: string }
  | { status: "closed_today"; nextOpenLabel: string | null }
  | { status: "unknown" };

function nowET(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
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
function programWindowToday(): ProgramWindow {
  const today = nowET();
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
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (hoursForDate(d)) {
      const dayName = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "America/New_York",
      }).format(d);
      const [openLabel] = (hoursForDate(d) || "").split("–").map((s) => s.trim());
      return { isToday: false, nextOpenLabel: `${dayName} at ${openLabel}` };
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
  const window = programWindowToday();
  if (!window.isToday) {
    return { status: "closed_today", nextOpenLabel: window.nextOpenLabel };
  }
  const nowMins = (() => {
    const d = nowET();
    return d.getHours() * 60 + d.getMinutes();
  })();
  if (nowMins < window.openMins) {
    return { status: "opens_later_today", opensAt: window.openLabel };
  }
  if (nowMins >= window.closeMins) {
    return { status: "closed_today", nextOpenLabel: null };
  }

  // We're within today's open window — fetch live lane count.
  try {
    const res = await fetch(FEED_URL, {
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
      closesAt: window.closeLabel,
      updatedAt,
    };
  } catch {
    return { status: "unknown" };
  }
}

// Pretty-printer for the dashboard pill.
export function laneStatusLabel(s: LaneStatus): {
  text: string;
  sub: string | null;
  tone: "green" | "amber" | "red" | "gray";
} {
  if (s.status === "open_now") {
    const tone: "green" | "amber" =
      s.lanesOpen === 0 ? "amber" : "green";
    const openUntil = s.closesAt ? `We're open until ${s.closesAt}` : "We're open now";
    const text =
      s.lanesOpen === 0
        ? `${openUntil} · no lanes free right now`
        : `${openUntil} · ${s.lanesOpen} of ${s.lanesTotal} lane${s.lanesTotal === 1 ? "" : "s"} available`;
    return { text, sub: relativeAgo(s.updatedAt), tone };
  }
  if (s.status === "opens_later_today") {
    return {
      text: `Closed right now · opens today at ${s.opensAt}`,
      sub: null,
      tone: "amber",
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
