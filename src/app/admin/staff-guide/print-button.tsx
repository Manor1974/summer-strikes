"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-sl-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-sl-navy-light"
    >
      Print / Save as PDF
    </button>
  );
}
