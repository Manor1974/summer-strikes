"use client";

import { useState, useTransition } from "react";
import { broadcastSms } from "../actions";

const TEMPLATES: { name: string; body: string }[] = [
  {
    name: "Weekend reminder",
    body: "Manor Lanes reminder: Summer Strikes is available this Saturday 11am–5pm. See you on the lanes!",
  },
  {
    name: "Schedule change",
    body: "Heads up from Manor Lanes: Summer Strikes hours are changing this week. Check manorlanes.com for the latest.",
  },
  {
    name: "Custom",
    body: "",
  },
];

export default function SmsBroadcastForm({ recipients }: { recipients: number }) {
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const charsLeft = 160 - body.length - 25; // reserve room for opt-out suffix

  const send = () => {
    setError(null);
    setResult(null);
    if (!body.trim()) {
      setError("Message can't be empty.");
      return;
    }
    if (recipients === 0) {
      setError("No opted-in recipients.");
      return;
    }
    startTransition(async () => {
      try {
        const r = await broadcastSms(body.trim());
        setResult(r);
        setBody("");
        setConfirming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Send failed");
      }
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => setBody(t.body)}
            className="rounded-full border border-black/10 px-3 py-1 text-xs text-sl-navy/70 hover:border-sl-navy hover:text-sl-navy"
          >
            {t.name}
          </button>
        ))}
      </div>

      <label className="block text-xs text-sl-navy/60">Message</label>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setConfirming(false);
        }}
        rows={4}
        className="mt-1 w-full rounded-md border border-black/10 bg-sl-light p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        placeholder="Type your message…"
      />
      <p className={`mt-1 text-[11px] ${charsLeft < 0 ? "text-sl-red" : "text-sl-navy/50"}`}>
        {body.length} chars · {charsLeft >= 0 ? `${charsLeft} left before SMS split` : "Will split into multiple SMS"}
      </p>

      {body && (
        <div className="mt-3 rounded-md bg-sl-navy px-4 py-3 text-xs text-white">
          <p className="opacity-50 mb-1">Preview (as recipient will see):</p>
          {body} Reply STOP to opt out.
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-3 rounded-md bg-[#EAF3DE] px-3 py-2 text-sm text-[#3B6D11]">
          Sent {result.sent} · failed {result.failed}.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending || !body.trim() || recipients === 0}
            className="rounded-md bg-sl-red px-4 py-2 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-40"
          >
            Send to {recipients} recipients
          </button>
        ) : (
          <>
            <span className="text-sm text-sl-navy">
              Send to {recipients} recipients — are you sure?
            </span>
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="rounded-md bg-sl-red px-4 py-2 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-40"
            >
              {pending ? "Sending…" : "Yes, send now"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-md border border-black/10 px-3 py-2 text-sm text-sl-navy/70 hover:border-sl-navy hover:text-sl-navy"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
