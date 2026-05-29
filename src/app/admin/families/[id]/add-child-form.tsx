"use client";

import { useState, useTransition } from "react";
import { addChildToFamily } from "../../actions";

export default function AddChildForm({
  userId,
  baseUrl,
}: {
  userId: string;
  baseUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [generate, setGenerate] = useState(true);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    childName: string;
    voucherId: string | null;
    qrDataUrl: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ageNum = parseInt(age, 10);
    if (!Number.isFinite(ageNum)) {
      setError("Age must be a number");
      return;
    }
    startTransition(async () => {
      try {
        const r = await addChildToFamily({
          userId,
          name,
          age: ageNum,
          generateTodayVoucher: generate,
        });
        // If a voucher was created, build the QR on the client (no need to
        // call the server again for an inline QR).
        let qrDataUrl: string | null = null;
        if (r.voucherId) {
          const QRCode = (await import("qrcode")).default;
          qrDataUrl = await QRCode.toDataURL(`${baseUrl}/redeem/${r.voucherId}`, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 320,
            color: { dark: "#1a2744", light: "#ffffff" },
          });
        }
        setResult({ childName: r.childName, voucherId: r.voucherId, qrDataUrl });
        setName("");
        setAge("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add child");
      }
    });
  };

  if (result) {
    return (
      <div className="mt-3 rounded-2xl border border-[#3B6D11]/30 bg-[#EAF3DE] p-5 text-center">
        <p className="text-sm font-medium text-[#3B6D11]">
          ✓ Added {result.childName}
        </p>
        {result.qrDataUrl ? (
          <>
            <p className="mt-1 text-xs text-sl-navy/60">
              Today&apos;s voucher ready &mdash; scan this to start their games:
            </p>
            <div className="mt-3 inline-block rounded-lg bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.qrDataUrl}
                alt={`Voucher QR for ${result.childName}`}
                className="h-56 w-56"
              />
            </div>
            <p className="mt-3 text-[11px] text-sl-navy/60">
              Or open the redemption page directly:{" "}
              <a
                href={`/redeem/${result.voucherId}`}
                className="text-sl-red hover:underline"
              >
                /redeem/{result.voucherId?.slice(-8)}
              </a>
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-sl-navy/60">
            No voucher generated today.
          </p>
        )}
        <button
          onClick={() => {
            setResult(null);
            setOpen(true);
          }}
          className="mt-4 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-sl-navy hover:bg-white"
        >
          Add another child
        </button>
      </div>
    );
  }

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-sl-navy hover:border-sl-navy"
        >
          + Add child
        </button>
      ) : (
        <form
          onSubmit={submit}
          className="mt-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-medium text-sl-navy">Add a child</p>
          <p className="mt-0.5 text-xs text-sl-navy/60">
            For new family members the parent didn&apos;t register up front.
          </p>
          <div className="mt-3 grid grid-cols-[1fr_90px] gap-2.5">
            <div>
              <label className="block text-xs text-sl-navy/60">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Emma Russo"
                className="mt-1 h-9 w-full rounded-md border border-black/10 bg-sl-light px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
              />
            </div>
            <div>
              <label className="block text-xs text-sl-navy/60">Age</label>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                inputMode="numeric"
                placeholder="8"
                className="mt-1 h-9 w-full rounded-md border border-black/10 bg-sl-light px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
              />
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-sl-navy">
            <input
              type="checkbox"
              checked={generate}
              onChange={(e) => setGenerate(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-sl-red"
            />
            <span>
              Generate today&apos;s voucher & QR code immediately (so they can
              bowl right now)
            </span>
          </label>
          {error && (
            <p className="mt-2 rounded-md bg-sl-red/10 px-3 py-2 text-xs text-sl-red">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-sl-red px-3 py-1.5 text-xs font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add child"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-sl-navy hover:border-sl-navy"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}
