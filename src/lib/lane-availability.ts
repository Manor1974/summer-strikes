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
  | { status: "closed_now"; updatedAt: string }
  | { status: "unknown" };

// Extract closing time from today's program hours ("5:00pm – 11:00pm" → "11:00pm")
function closingTimeToday(): string | null {
  const todayET = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const hours = hoursForDate(todayET);
  if (!hours) return null;
  const match = hours.match(/–\s*([0-9: apm]+)$/i);
  return match ? match[1].trim() : null;
}

type Feed = {
  updated_at?: string;
  lanes_total?: number;
  lanes_available_now?: number;
  lanes_in_use?: number;
  currently_open?: boolean;
};

export async function getLaneStatus(): Promise<LaneStatus> {
  try {
    const res = await fetch(FEED_URL, {
      // Tight cache: 30s. The FRONTDESK1 poller writes the JSON every ~60s,
      // so worst-case our dashboard trails real lane state by ~90s. Never
      // less than 30s though — protects manorlanes.com from a hammer if
      // many parents are on the dashboard at once.
      next: { revalidate: 30, tags: ["lane-availability"] },
    });
    if (!res.ok) return { status: "unknown" };
    const feed = (await res.json()) as Feed;
    if (typeof feed.lanes_available_now !== "number") {
      return { status: "unknown" };
    }
    const updatedAt = feed.updated_at ?? new Date().toISOString();
    if (!feed.currently_open) {
      return { status: "closed_now", updatedAt };
    }
    return {
      status: "open_now",
      lanesOpen: feed.lanes_available_now,
      lanesTotal: feed.lanes_total ?? 24,
      closesAt: closingTimeToday(),
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
  if (s.status === "closed_now") {
    return {
      text: "Closed right now",
      sub: relativeAgo(s.updatedAt),
      tone: "red",
    };
  }
  return {
    text: "Lane availability unavailable",
    sub: null,
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
