"use client";

import { useState, useTransition } from "react";
import { sendAnnouncementTest, broadcastAnnouncement } from "./actions";

export default function AnnouncementClient({
  subject,
  html,
  text,
  myEmail,
  baseUrl,
}: {
  subject: string;
  html: string;
  text: string;
  myEmail: string;
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"preview" | "html" | "text">("preview");
  const [recipientsText, setRecipientsText] = useState("");
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sendTest = () => {
    setStatus(null);
    startTransition(async () => {
      try {
        await sendAnnouncementTest();
        setStatus(`✓ Sent test to ${myEmail}`);
      } catch (e) {
        setStatus(`Error: ${e instanceof Error ? e.message : "send failed"}`);
      }
    });
  };

  const copyHtml = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const broadcast = () => {
    setStatus(null);
    const emails = recipientsText
      .split(/[\s,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@") && e.length > 3);
    if (emails.length === 0) {
      setStatus("Paste at least one email address");
      return;
    }
    startTransition(async () => {
      try {
        const r = await broadcastAnnouncement(emails);
        setStatus(`✓ Sent ${r.sent}, failed ${r.failed} (${r.total} addresses)`);
        setConfirmBroadcast(false);
      } catch (e) {
        setStatus(`Error: ${e instanceof Error ? e.message : "send failed"}`);
      }
    });
  };

  return (
    <>
      <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-black/5 pb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-sl-navy/60">Subject</p>
            <p className="text-sm font-medium text-sl-navy">{subject}</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={sendTest}
              disabled={pending || !myEmail}
              className="rounded-md bg-sl-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-sl-navy-light disabled:opacity-50"
            >
              {pending ? "Sending…" : `Send test to ${myEmail || "yourself"}`}
            </button>
            <button
              onClick={copyHtml}
              className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-sl-navy hover:bg-sl-light"
            >
              {copied ? "Copied!" : "Copy HTML"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-1 border-b border-black/5">
          {(["preview", "html", "text"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-t-md px-3 py-2 text-xs font-medium ${
                tab === t
                  ? "bg-sl-light text-sl-navy"
                  : "text-sl-navy/50 hover:text-sl-navy"
              }`}
            >
              {t === "preview" ? "Preview" : t === "html" ? "HTML source" : "Plain text"}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {tab === "preview" && (
            <iframe
              srcDoc={html}
              className="h-[700px] w-full rounded-md border border-black/5 bg-white"
              title="Email preview"
            />
          )}
          {tab === "html" && (
            <pre className="max-h-[700px] overflow-auto rounded-md bg-sl-light p-3 text-[10px] leading-relaxed text-sl-navy/70">
              {html}
            </pre>
          )}
          {tab === "text" && (
            <pre className="max-h-[700px] overflow-auto whitespace-pre-wrap rounded-md bg-sl-light p-3 text-xs text-sl-navy/70">
              {text}
            </pre>
          )}
        </div>

        {status && (
          <p
            className={`mt-3 rounded-md px-3 py-2 text-sm ${
              status.startsWith("✓")
                ? "bg-[#EAF3DE] text-[#3B6D11]"
                : "bg-sl-red/10 text-sl-red"
            }`}
          >
            {status}
          </p>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-sl-navy">
          Send to your customer list
        </h2>
        <p className="mt-1 text-xs text-sl-navy/60">
          Paste email addresses below — one per line, or separated by commas /
          semicolons. We&apos;ll send via Resend.
        </p>
        <div className="mt-2 rounded-md bg-sl-gold/10 px-3 py-2 text-xs text-sl-navy/80">
          <strong>Best practice:</strong> only send to people who&apos;ve opted
          in to Manor Lanes emails. If your list lives in Mailchimp / Klaviyo /
          etc., use the &ldquo;Copy HTML&rdquo; button above and paste it
          there instead — those tools handle unsubscribe links and compliance.
        </div>

        <textarea
          value={recipientsText}
          onChange={(e) => {
            setRecipientsText(e.target.value);
            setConfirmBroadcast(false);
          }}
          rows={6}
          placeholder="customer1@example.com&#10;customer2@example.com&#10;…"
          className="mt-3 w-full rounded-md border border-black/10 bg-sl-light p-3 font-mono text-xs"
        />

        <p className="mt-1 text-[11px] text-sl-navy/50">
          {
            recipientsText
              .split(/[\s,;\n]+/)
              .map((e) => e.trim())
              .filter((e) => e.includes("@") && e.length > 3).length
          }{" "}
          valid addresses detected
        </p>

        <div className="mt-3 flex items-center gap-3">
          {!confirmBroadcast ? (
            <button
              onClick={() => setConfirmBroadcast(true)}
              disabled={pending}
              className="rounded-md bg-sl-red px-4 py-2 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-40"
            >
              Send announcement to list
            </button>
          ) : (
            <>
              <span className="text-sm text-sl-navy">Are you sure?</span>
              <button
                onClick={broadcast}
                disabled={pending}
                className="rounded-md bg-sl-red px-4 py-2 text-sm font-medium text-white hover:bg-sl-red-dark disabled:opacity-40"
              >
                {pending ? "Sending…" : "Yes, send now"}
              </button>
              <button
                onClick={() => setConfirmBroadcast(false)}
                disabled={pending}
                className="rounded-md border border-black/10 px-3 py-2 text-sm text-sl-navy/70 hover:border-sl-navy"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </section>

      <p className="mt-4 text-[11px] text-sl-navy/40">
        Email links to: <code>{baseUrl}/register</code>
      </p>
    </>
  );
}
