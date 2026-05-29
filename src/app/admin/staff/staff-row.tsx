"use client";

import { useState, useTransition } from "react";
import { changeUserRole, resetUserPassword } from "../actions";

type Props = {
  user: {
    id: string;
    email: string;
    name: string;
    role: "PARENT" | "ADMIN" | "STAFF";
    createdAt: string;
  };
};

export default function StaffRow({ user }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newPw, setNewPw] = useState("");

  const handleDemote = () => {
    if (!confirm(`Remove staff/admin access from ${user.email}? They'll become a regular parent account.`)) return;
    startTransition(async () => {
      try {
        await changeUserRole(user.id, "PARENT");
        setMsg("Demoted to PARENT");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const handleSwap = () => {
    const target = user.role === "ADMIN" ? "STAFF" : "ADMIN";
    if (!confirm(`Change role of ${user.email} from ${user.role} to ${target}?`)) return;
    startTransition(async () => {
      try {
        await changeUserRole(user.id, target);
        setMsg(`Changed to ${target}`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const handlePasswordReset = () => {
    if (newPw.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }
    startTransition(async () => {
      try {
        await resetUserPassword(user.id, newPw);
        setMsg(`✓ Password reset — give them: ${newPw}`);
        setResetting(false);
        setNewPw("");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <tr className="hover:bg-sl-light/50">
      <td className="px-4 py-3 text-sl-navy">{user.name}</td>
      <td className="px-4 py-3 text-sl-navy/80">{user.email}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            user.role === "ADMIN"
              ? "bg-sl-red/15 text-sl-red"
              : "bg-sl-gold/20 text-sl-gold"
          }`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-sl-navy/60">{user.createdAt}</td>
      <td className="px-4 py-3 text-right">
        {resetting ? (
          <div className="flex justify-end gap-1">
            <input
              type="text"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              className="h-7 w-32 rounded border border-black/10 bg-sl-light px-2 text-xs font-mono"
            />
            <button
              onClick={handlePasswordReset}
              disabled={pending}
              className="rounded bg-sl-red px-2 py-0.5 text-xs font-medium text-white hover:bg-sl-red-dark disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setResetting(false); setNewPw(""); }}
              className="rounded border border-black/10 px-2 py-0.5 text-xs text-sl-navy/70"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <button
              onClick={handleSwap}
              disabled={pending}
              className="rounded border border-black/10 px-2 py-1 text-[11px] text-sl-navy/70 hover:border-sl-navy"
            >
              → {user.role === "ADMIN" ? "Staff" : "Admin"}
            </button>
            <button
              onClick={() => setResetting(true)}
              disabled={pending}
              className="rounded border border-black/10 px-2 py-1 text-[11px] text-sl-navy/70 hover:border-sl-navy"
            >
              Reset PW
            </button>
            <button
              onClick={handleDemote}
              disabled={pending}
              className="rounded border border-sl-red/30 px-2 py-1 text-[11px] text-sl-red hover:bg-sl-red/5"
            >
              Remove
            </button>
          </div>
        )}
        {msg && <p className="mt-1 text-[10px] text-sl-navy/60">{msg}</p>}
      </td>
    </tr>
  );
}
