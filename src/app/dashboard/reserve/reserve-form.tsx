"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReservation } from "./actions";

// 30-min slots from 5:00pm to 10:00pm (last start, gives at least an hour
// before close at 11pm).
const TIME_SLOTS = [
  { value: "17:00", label: "5:00 PM" },
  { value: "17:30", label: "5:30 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "18:30", label: "6:30 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "19:30", label: "7:30 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "20:30", label: "8:30 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "21:30", label: "9:30 PM" },
  { value: "22:00", label: "10:00 PM" },
];

export default function ReserveForm({
  validDates,
  reservationCode,
}: {
  validDates: { iso: string; label: string }[];
  reservationCode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(validDates[0]?.iso || "");
  const [time, setTime] = useState("18:00");
  const [partySize, setPartySize] = useState("4");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createReservation({
          reservationDate: date,
          startTime: time,
          partySize: parseInt(partySize, 10),
          notes: notes.trim() || undefined,
        });
        router.push("/dashboard?reservation=submitted");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't submit");
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="mt-5 space-y-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">Date</label>
        <select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        >
          {validDates.length === 0 ? (
            <option value="">No program days remaining</option>
          ) : (
            validDates.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.label}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">Start time</label>
        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        >
          {TIME_SLOTS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-sl-navy/50">
          Lanes close at 11 PM. Allow at least an hour for your game.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">Party size</label>
        <input
          type="number"
          min={1}
          max={12}
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          required
          className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">
          Anything we should know? <span className="opacity-50">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. need bumpers for the 4yo"
          className="w-full rounded-md border border-black/10 bg-sl-light p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        />
      </div>

      {reservationCode && (
        <p className="rounded-md bg-sl-gold/10 px-3 py-2 text-xs text-sl-navy/80">
          Your family code{" "}
          <span className="font-mono font-bold text-sl-navy">
            {reservationCode}
          </span>{" "}
          is attached automatically. Show it at the desk if asked.
        </p>
      )}

      {error && (
        <p className="rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || validDates.length === 0}
        className="w-full rounded-md bg-sl-red px-4 py-3 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Reserve a lane"}
      </button>
    </form>
  );
}
