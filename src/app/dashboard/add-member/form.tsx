"use client";

import { useState } from "react";

type AdultDraft = { name: string; age: string };

export default function AddMemberForm() {
  const [adults, setAdults] = useState<AdultDraft[]>([{ name: "", age: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = adults.length * 49.95;

  const updateAdult = (i: number, patch: Partial<AdultDraft>) => {
    setAdults((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
    );
  };
  const removeAdult = (i: number) => {
    if (adults.length === 1) return;
    setAdults((prev) => prev.filter((_, idx) => idx !== i));
  };
  const addAdult = () => {
    if (adults.length >= 8) return;
    setAdults((prev) => [...prev, { name: "", age: "" }]);
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);

    const parsed = adults.map((a) => ({
      name: a.name.trim(),
      age: parseInt(a.age, 10),
    }));
    for (const a of parsed) {
      if (!a.name || a.name.length < 2) {
        setError("Each adult needs a full name.");
        setSubmitting(false);
        return;
      }
      if (!Number.isFinite(a.age) || a.age < 16) {
        setError("Family Pass is for ages 16 and up.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/family-pass/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adults: parsed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Couldn't start checkout. Try again.");
        setSubmitting(false);
        return;
      }
      window.location.href = json.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="space-y-2.5">
        {adults.map((a, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_auto] items-end gap-2.5">
            <div>
              {i === 0 && (
                <label className="mb-1 block text-xs text-sl-navy/60">
                  Adult&apos;s full name
                </label>
              )}
              <input
                value={a.name}
                onChange={(e) => updateAdult(i, { name: e.target.value })}
                placeholder="Chris Smith"
                className="h-[34px] w-full rounded-md border border-black/10 bg-sl-light px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
              />
            </div>
            <div>
              {i === 0 && <label className="mb-1 block text-xs text-sl-navy/60">Age</label>}
              <input
                value={a.age}
                onChange={(e) => updateAdult(i, { age: e.target.value })}
                placeholder="42"
                inputMode="numeric"
                className="h-[34px] w-full rounded-md border border-black/10 bg-sl-light px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
              />
            </div>
            <button
              type="button"
              onClick={() => removeAdult(i)}
              disabled={adults.length === 1}
              aria-label="Remove"
              className="h-[34px] rounded-md border border-black/10 px-3 text-sl-navy/60 disabled:opacity-30 hover:border-sl-red hover:text-sl-red"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-sm">
        <button
          type="button"
          onClick={addAdult}
          disabled={adults.length >= 8}
          className="font-medium text-sl-red hover:underline disabled:opacity-50"
        >
          + Add another adult
        </button>
        <div className="text-sl-navy">
          <span className="text-sl-navy/60">Total: </span>
          <span className="font-medium">${total.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-4 w-full rounded-md bg-sl-red px-4 py-3 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
      >
        {submitting ? "Sending you to checkout…" : `Continue to checkout · $${total.toFixed(2)} →`}
      </button>

      <p className="mt-2 text-[11px] text-sl-navy/50">
        Payment is processed by Stripe. After payment, your new Family Pass
        members will appear in your dashboard.
      </p>
    </div>
  );
}
