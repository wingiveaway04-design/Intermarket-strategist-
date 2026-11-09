"use client";

import Link from "next/link";
import NotificationBell from "@/components/notification-bell";

const links = [
  ["Overview", "#overview"],
  ["Live sessions", "/sessions#live-sessions"],
  ["Video library", "/sessions#session-library"],
  ["News & Macro", "/news-trading"],
  ["Event Radar", "/macro-radar"],
  ["Trade ideas", "/setups"],
  ["Research", "/analysis"],
  ["COT reports", "/cot-reports"],
  ["Community", "/lounge"],
  ["Messages", "/messages"],
  ["My journal", "#journal"],
] as const;

export default function TerminalTopNav({ isPremium, isAdmin }: { isPremium: boolean; isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-40 -mx-3 border-b border-cyan-100/10 bg-[#081525]/95 px-3 pb-3 pt-3 shadow-[0_14px_36px_rgba(0,0,0,.28)] backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/[.08] text-[11px] font-black tracking-wider text-cyan-100">AIS</span>
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[.2em] text-cyan-200">Intermarket Strategist</span>
              <span className="mt-0.5 block text-base font-semibold tracking-tight text-slate-100">Terminal</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isPremium ? (
              <span className="rounded-full border border-emerald-200/15 bg-emerald-200/[.07] px-3 py-1.5 text-[10px] font-semibold text-emerald-100">Premium access active</span>
            ) : (
              <Link href="/pricing" className="rounded-full border border-amber-200/20 bg-amber-200/[.07] px-3 py-1.5 text-[10px] font-semibold text-amber-100 transition hover:bg-amber-200/[.12]">Explore Premium ↗</Link>
            )}
            {isAdmin && <Link href="/admin" className="rounded-lg border border-cyan-200/15 px-3 py-2 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-200/[.06]">Admin</Link>}
            <NotificationBell />
            <Link href="/profile" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-medium text-slate-300 hover:bg-white/[.05]">Profile</Link>
            <Link href="/settings" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-medium text-slate-300 hover:bg-white/[.05]">Settings</Link>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-medium text-slate-300 transition hover:border-rose-200/20 hover:bg-rose-200/[.05] hover:text-rose-100">Sign out</button>
            </form>
          </div>
        </div>
        <nav aria-label="Terminal navigation" className="mt-3 flex items-center gap-1 overflow-x-auto border-t border-white/[.06] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map(([label, href], index) => (
            <Link
              key={label}
              href={href}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-medium transition ${index === 0 ? "border border-cyan-200/15 bg-cyan-200/[.09] text-cyan-100" : "text-slate-400 hover:bg-white/[.05] hover:text-slate-100"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
