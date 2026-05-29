"use client";

import { useState, useTransition } from "react";
import { createStaffAccount } from "../actions";

export default function AddStaffForm() {
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setOk(null);
    startTransition(async () => {
      try {
        const r = await createStaffAccount({ email, firstName, lastName, password, role });
        setMsg(`✓ Created ${role.toLowerCase()} account for ${r.email}`);
        setOk(true);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Couldn't create account");
        setOk(false);
      }
    });
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 12; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(pw);
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-sl-navy/60">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="Desk"
            className="h-9 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-sl-navy/60">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            placeholder="Staff"
            className="h-9 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">Email (login)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="desk@manorlanes.com"
          autoComplete="off"
          className="h-9 w-full rounded-md border border-black/10 bg-sl-light px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">Password (min 6 chars)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Set or generate"
            autoComplete="off"
            className="h-9 flex-1 rounded-md border border-black/10 bg-sl-light px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sl-navy/20"
          />
          <button
            type="button"
            onClick={generatePassword}
            className="h-9 rounded-md border border-black/10 px-3 text-xs font-medium text-sl-navy hover:bg-sl-light"
          >
            Generate
          </button>
        </div>
        <p className="mt-1 text-[11px] text-sl-navy/50">
          Write this down — give it to whoever will use this account.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs text-sl-navy/60">Role</label>
        <div className="flex gap-2">
          {(["STAFF", "ADMIN"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                role === r
                  ? "border-sl-navy bg-sl-navy text-white"
                  : "border-black/10 bg-white text-sl-navy/70 hover:border-sl-navy"
              }`}
            >
              {r === "STAFF" ? "Staff (desk only)" : "Admin (full access)"}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            ok ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-sl-red/10 text-sl-red"
          }`}
        >
          {msg}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-sl-red px-4 py-2 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
