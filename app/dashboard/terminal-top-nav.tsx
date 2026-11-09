"use client";

import { useState } from "react";
import Link from "next/link";
import NotificationBell from "@/components/notification-bell";

const sections = [
  {
    title: "Workspace",
    items: [
      ["Overview", "#overview", "Your terminal home and performance snapshot"],
      ["My Journal", "#journal", "Your private trading journal and analytics"],
      ["Trade Ideas", "/setups", "Published trade calls and active setups"],
    ],
  },
  {
    title: "Market Intelligence",
    items: [
      ["News & Macro", "/news-trading", "News trading outlook and macro context"],
      ["Macro Event Radar", "/macro-radar", "Economic releases and event scenarios"],
      ["Research", "/analysis", "Market analysis and research publications"],
      ["COT Reports", "/cot-reports", "Weekly positioning and COT intelligence"],
    ],
  },
  {
    title: "Sessions & Community",
    items: [
      ["Live Sessions", "/sessions#live-sessions", "Join scheduled analyst sessions"],
      ["Video Library", "/sessions#session-library", "Watch previous sessions"],
      ["Community", "/lounge", "Discuss markets with members"],
      ["Messages", "/messages", "Private member conversations"],
    ],
  },
] as const;

export default function TerminalTopNav({ isPremium, isAdmin }: { isPremium: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 -mx-3 border-b border-cyan-100/10 bg-[#081525]/95 px-3 py-3 shadow-[0_14px_36px_rgba(0,0,0,.28)] backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/[.08] text-[11px] font-black tracking-wider text-cyan-100">AIS</span>
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[.2em] text-cyan-200">Intermarket Strategist</span>
              <span className="mt-0.5 block text-base font-semibold tracking-tight text-slate-100">Terminal</span>
            </span>
          </Link>

          <button
            type="button"
            aria-expanded={open}
            aria-controls="terminal-navigation-panel"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-200/[.08] px-4 py-2.5 text-xs font-semibold text-cyan-50 transition hover:border-cyan-100/40 hover:bg-cyan-200/[.13]"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              {open ? <path d="m5 5 10 10M15 5 5 15" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
            </svg>
            {open ? "Close navigation" : "Terminal Navigation"}
          </button>
        </div>

        {open && (
          <div id="terminal-navigation-panel" className="mt-3 rounded-2xl border border-cyan-100/10 bg-[#0c1b2d] p-3 shadow-2xl sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] pb-3">
              <div>
                <p className="text-xs font-semibold text-slate-100">Terminal destinations</p>
                <p className="mt-1 text-[10px] text-slate-500">Choose a workspace or service to open</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${isPremium ? "border-emerald-200/15 bg-emerald-200/[.07] text-emerald-100" : "border-slate-300/15 bg-white/[.04] text-slate-300"}`}>
                {isPremium ? "Premium member" : "Free member"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="mb-2 text-[9px] font-bold uppercase tracking-[.18em] text-cyan-200">{section.title}</h2>
                  <div className="grid gap-1.5">
                    {section.items.map(([label, href, description]) => (
                      <Link key={label} href={href} onClick={() => setOpen(false)} className="group rounded-xl border border-white/[.055] bg-white/[.02] px-3 py-2.5 transition hover:border-cyan-200/20 hover:bg-cyan-200/[.05]">
                        <span className="block text-xs font-semibold text-slate-200 group-hover:text-cyan-100">{label}</span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{description}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-4 border-t border-white/[.07] pt-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[.18em] text-cyan-200">Membership & account</p>
              <div className="flex flex-wrap items-center gap-2">
                {isPremium ? (
                  <span className="rounded-lg border border-emerald-200/15 bg-emerald-200/[.06] px-3 py-2 text-[10px] font-medium text-emerald-100">Premium access active</span>
                ) : (
                  <Link href="/pricing" onClick={() => setOpen(false)} className="rounded-lg border border-amber-200/20 bg-amber-200/[.07] px-3 py-2 text-[10px] font-semibold text-amber-100 hover:bg-amber-200/[.12]">Explore Premium ↗</Link>
                )}
                {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg border border-cyan-200/15 px-3 py-2 text-[10px] font-medium text-cyan-100 hover:bg-cyan-200/[.06]">Admin workspace</Link>}
                <Link href="/profile" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-300 hover:bg-white/[.05]">Profile</Link>
                <Link href="/settings" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-300 hover:bg-white/[.05]">Settings</Link>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-slate-300">
                  <NotificationBell />
                  <span>Notifications</span>
                </div>
                <form action="/auth/signout" method="post">
                  <button className="rounded-lg border border-rose-200/15 px-3 py-2 text-[10px] font-medium text-rose-100 transition hover:bg-rose-200/[.06]">Sign out</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
