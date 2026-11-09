"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  ["Overview", "#overview"],
  ["Live sessions", "/sessions#live-sessions"],
  ["Video library", "/sessions#session-library"],
  ["News & Macro", "/news-trading"],
  ["Macro Event Radar", "/macro-radar"],
  ["Trade ideas", "/setups"],
  ["Research", "/analysis"],
  ["COT reports", "/cot-reports"],
  ["Community", "/lounge"],
  ["Private messages", "/messages"],
  ["My journal", "#journal"],
] as const;

export default function TerminalMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="terminal-mobile-links"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-white/[.08] bg-[#0d1a2b] px-4 py-3 text-left text-xs font-semibold text-slate-200 transition hover:border-cyan-200/20 hover:bg-[#102238]"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-base text-cyan-200">{open ? "×" : "☰"}</span>
          Terminal navigation
        </span>
        <span className="text-[10px] font-medium text-slate-500">{open ? "Close" : "Menu"}</span>
      </button>
      {open && (
        <nav id="terminal-mobile-links" aria-label="Terminal sections" className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-white/[.08] bg-[#0b1727] p-3 sm:grid-cols-3">
          {links.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/[.05] bg-white/[.02] px-3 py-3 text-xs text-slate-300 transition hover:border-cyan-200/20 hover:bg-cyan-200/[.06] hover:text-cyan-100"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
