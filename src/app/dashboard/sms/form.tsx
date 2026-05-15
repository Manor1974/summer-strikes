"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SmsPrefsForm({
  initialOptIn,
  initialPhone,
}: {
  initialOptIn: boolean;
  initialPhone: string;
}) {
  const router = useRouter();
  const [optIn, setOptIn] = useState(initialOptIn);
  const [phone, setPhone] = useState(formatForDisplay(initialPhone));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/me/sms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smsOptIn: optIn, phone }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Couldn't save. Try again.");
      setSaving(false);
      return;
    }
    setMessage(optIn ? "Text alerts enabled." : "Text alerts turned off.");
    setSaving(false);
    router.refresh();
  };

  return (
    <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-sl-red"
        />
        <span className="text-sm text-sl-navy">
          Send me daily voucher reminders during Summer Strikes. Message and
          data rates may apply. I can reply STOP at any time to opt out.
        </span>
      </label>

      <div className="mt-4">
        <label className="mb-1 block text-xs text-sl-navy/60">
          Mobile phone
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(716) 555-1234"
          className="h-10 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-3 rounded-md bg-[#EAF3DE] px-3 py-2 text-sm text-[#3B6D11]">
          {message}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 w-full rounded-md bg-sl-red px-4 py-3 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}

function formatForDisplay(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}
