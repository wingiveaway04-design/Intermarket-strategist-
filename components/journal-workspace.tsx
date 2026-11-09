"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import RecordDeleteButton from "@/components/record-delete-button";

type JournalTrade = {
  id: string;
  instrument: string;
  market: string | null;
  direction: string | null;
  status: string | null;
  created_at: string;
  entry_price: number | null;
  stop_loss: number | null;
  thesis: string | null;
  fundamental_analysis: string | null;
  intermarket_analysis: string | null;
  news_trade_attribution: string | null;
  news_event_type: string | null;
  news_event_name: string | null;
  realized_r: number | null;
};

type Props = { trades: JournalTrade[]; screenshots: Record<string, string> };

const filters = [
  { id: "all", label: "All records" },
  { id: "in_progress", label: "Open" },
  { id: "wins", label: "Winners" },
  { id: "losses", label: "Losses" },
  { id: "closed", label: "Closed" },
] as const;

function statusTone(status: string | null) {
  if (status === "in_progress") return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
  if (status === "all_targets_hit") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  if (status === "stopped_out") return "border-rose-300/20 bg-rose-300/10 text-rose-100";
  if (status === "breakeven") return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  return "border-violet-300/20 bg-violet-300/10 text-violet-100";
}

function pretty(value: string | null | undefined) {
  return (value || "Not specified").replaceAll("_", " ");
}

export default function JournalWorkspace({ trades, screenshots }: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("all");
  const [sort, setSort] = useState("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [performanceRange, setPerformanceRange] = useState<"weekly" | "monthly">("monthly");

  const markets = useMemo(() => Array.from(new Set(trades.map(t => t.market).filter((v): v is string => Boolean(v)))).sort(), [trades]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trades.filter(t => {
      const matchesQuery = !query || [t.instrument, t.market, t.direction, t.status, t.thesis, t.news_event_name]
        .some(v => String(v || "").toLowerCase().includes(query));
      const matchesMarket = market === "all" || t.market === market;
      const result = Number(t.realized_r);
      const matchesFilter = filter === "all"
        || (filter === "in_progress" && t.status === "in_progress")
        || (filter === "wins" && t.realized_r !== null && result > 0)
        || (filter === "losses" && t.realized_r !== null && result < 0)
        || (filter === "closed" && ["all_targets_hit", "stopped_out", "breakeven", "closed_manually"].includes(t.status || ""));
      return matchesQuery && matchesMarket && matchesFilter;
    }).sort((a, b) => {
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "best") return Number(b.realized_r ?? -Infinity) - Number(a.realized_r ?? -Infinity);
      if (sort === "worst") return Number(a.realized_r ?? Infinity) - Number(b.realized_r ?? Infinity);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [trades, search, market, filter, sort]);

  const openCount = trades.filter(t => t.status === "in_progress").length;
  const closed = trades.filter(t => ["all_targets_hit", "stopped_out", "breakeven", "closed_manually"].includes(t.status || "") && t.realized_r !== null);
  const winners = closed.filter(t => Number(t.realized_r) > 0).length;
  const losers = closed.filter(t => Number(t.realized_r) < 0).length;
  const netR = closed.reduce((sum, t) => sum + Number(t.realized_r || 0), 0);
  const winRate = winners + losers ? Math.round(winners / (winners + losers) * 100) : null;
  const statusCounts = [
    { label: "Open", count: openCount, color: "bg-cyan-300", text: "text-cyan-200" },
    { label: "Wins", count: winners, color: "bg-emerald-300", text: "text-emerald-200" },
    { label: "Losses", count: losers, color: "bg-rose-300", text: "text-rose-200" },
    { label: "Other closed", count: Math.max(0, closed.length - winners - losers), color: "bg-amber-300", text: "text-amber-200" },
  ];
  const maxStatus = Math.max(1, ...statusCounts.map(s => s.count));

  const closedTrades = closed.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const periodMap = new Map<string, { label: string; total: number; count: number }>();
  closedTrades.forEach(t => {
    const date = new Date(t.created_at);
    const keyDate = new Date(date);
    let key: string;
    let label: string;
    if (performanceRange === "monthly") {
      key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      label = date.toLocaleDateString("en", { month: "short", year: "2-digit" });
    } else {
      const day = (date.getDay() + 6) % 7;
      keyDate.setDate(date.getDate() - day);
      keyDate.setHours(0, 0, 0, 0);
      key = keyDate.toISOString().slice(0, 10);
      label = keyDate.toLocaleDateString("en", { day: "2-digit", month: "short" });
    }
    const current = periodMap.get(key) || { label, total: 0, count: 0 };
    current.total += Number(t.realized_r || 0);
    current.count += 1;
    periodMap.set(key, current);
  });
  const performancePeriods = Array.from(periodMap.values()).slice(-(performanceRange === "monthly" ? 6 : 8));
  const cumulative = performancePeriods.reduce<{ label: string; value: number; count: number }[]>((acc, period) => {
    const previous = acc.length ? acc[acc.length - 1].value : 0;
    acc.push({ label: period.label, value: previous + period.total, count: period.count });
    return acc;
  }, []);
  const chartValues = cumulative.map(p => p.value);
  const chartMin = Math.min(0, ...chartValues);
  const chartMax = Math.max(0, ...chartValues);
  const chartSpan = Math.max(1, chartMax - chartMin);
  const chartPoints = cumulative.map((p, i) => {
    const x = cumulative.length < 2 ? 50 : 12 + i * (276 / (cumulative.length - 1));
    const y = 92 - ((p.value - chartMin) / chartSpan) * 76;
    return { ...p, x, y };
  });
  const chartLine = chartPoints.map(p => p.x + "," + p.y).join(" ");
  const marketResults = markets.map(name => {
    const rows = closed.filter(t => t.market === name);
    return { name, count: rows.length, total: rows.reduce((sum, t) => sum + Number(t.realized_r || 0), 0) };
  }).filter(m => m.count).sort((a, b) => b.total - a.total);
  const maxMarketAbs = Math.max(0.1, ...marketResults.map(m => Math.abs(m.total)));
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthOffset = (monthStart.getDay() + 6) % 7;
  const activityDays = new Set(trades.filter(t => {
    const d = new Date(t.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).map(t => new Date(t.created_at).getDate()));
  const thisMonthRecords = activityDays.size;
  const activeWeeks = new Set(trades.map(t => {
    const d = new Date(t.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return monday.getFullYear() + "-" + monday.toISOString().slice(0, 10);
  })).size;


  return <section id="journal" className="mt-9 scroll-mt-6">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200/70">Personal trading journal</p><h2 className="mt-1 text-xl font-semibold text-slate-100">My Journal</h2><p className="mt-1 text-xs leading-5 text-slate-400">Your private execution record, searchable and organized around the outcomes you actually entered.</p></div>
      <Link href="/journal/new" className="rounded-xl border border-cyan-200/20 bg-cyan-200 px-4 py-2.5 text-xs font-bold text-[#082033] shadow-[0_8px_24px_rgba(34,211,238,.12)] hover:bg-cyan-100">＋ Record a trade</Link>
    </div>

    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <div className="rounded-2xl border border-cyan-200/15 bg-[linear-gradient(145deg,rgba(8,145,178,.16),rgba(12,28,46,.9))] p-3.5"><p className="text-[9px] font-bold uppercase tracking-wider text-cyan-100/70">Records shown</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white">{trades.length}</p><p className="mt-1 text-[10px] text-slate-400">Latest 30 entries</p></div>
      <div className="rounded-2xl border border-blue-200/15 bg-[linear-gradient(145deg,rgba(59,130,246,.16),rgba(12,28,46,.9))] p-3.5"><p className="text-[9px] font-bold uppercase tracking-wider text-blue-100/70">Open trades</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white">{openCount}</p><p className="mt-1 text-[10px] text-slate-400">Marked in progress</p></div>
      <div className="rounded-2xl border border-emerald-200/15 bg-[linear-gradient(145deg,rgba(16,185,129,.14),rgba(12,28,46,.9))] p-3.5"><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/70">Win rate</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white">{winRate === null ? "—" : winRate + "%"}</p><p className="mt-1 text-[10px] text-slate-400">Breakeven excluded</p></div>
      <div className={"rounded-2xl border p-3.5 " + (netR > 0 ? "border-emerald-200/15 bg-[linear-gradient(145deg,rgba(16,185,129,.14),rgba(12,28,46,.9))]" : netR < 0 ? "border-rose-200/15 bg-[linear-gradient(145deg,rgba(244,63,94,.14),rgba(12,28,46,.9))]" : "border-amber-200/15 bg-[linear-gradient(145deg,rgba(245,158,11,.12),rgba(12,28,46,.9))]")}><p className="text-[9px] font-bold uppercase tracking-wider text-slate-300/70">Net realized R</p><p className="mt-2 text-2xl font-semibold tabular-nums text-white">{closed.length ? (netR > 0 ? "+" : "") + netR.toFixed(2) + "R" : "—"}</p><p className="mt-1 text-[10px] text-slate-400">Closed records with R entered</p></div>
    </div>

    <div className="mt-4 grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
      <div className="rounded-2xl border border-cyan-200/10 bg-[linear-gradient(145deg,#10263b,#0a1727)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-cyan-200/70">Performance timeline</p><h3 className="mt-1 text-sm font-semibold text-white">Cumulative realized R</h3><p className="mt-1 text-[10px] text-slate-500">Grouped by trade record date · loaded closed trades only</p></div>
          <div className="flex rounded-lg border border-white/10 bg-black/15 p-1"><button type="button" onClick={() => setPerformanceRange("weekly")} className={"rounded-md px-3 py-1.5 text-[10px] font-semibold " + (performanceRange === "weekly" ? "bg-cyan-200/15 text-cyan-100" : "text-slate-400")}>Weekly</button><button type="button" onClick={() => setPerformanceRange("monthly")} className={"rounded-md px-3 py-1.5 text-[10px] font-semibold " + (performanceRange === "monthly" ? "bg-cyan-200/15 text-cyan-100" : "text-slate-400")}>Monthly</button></div>
        </div>
        {chartPoints.length ? <div className="mt-4">
          <div className="mb-2 flex items-center justify-between"><span className="text-[9px] text-slate-500">{performancePeriods.length} periods</span><span className={"text-sm font-semibold tabular-nums " + (chartValues[chartValues.length - 1] >= 0 ? "text-emerald-200" : "text-rose-200")}>{chartValues[chartValues.length - 1] > 0 ? "+" : ""}{chartValues[chartValues.length - 1].toFixed(2)}R cumulative</span></div>
          <svg viewBox="0 0 300 112" role="img" aria-label="Cumulative realized R chart" className="h-36 w-full overflow-visible">
            <line x1="8" x2="292" y1={92 - ((0 - chartMin) / chartSpan) * 76} y2={92 - ((0 - chartMin) / chartSpan) * 76} stroke="rgba(148,163,184,.28)" strokeDasharray="3 4"/>
            {chartPoints.length > 1 && <polyline points={chartLine} fill="none" stroke="#67e8f9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
            {chartPoints.map((p,i) => <g key={p.label}><circle cx={p.x} cy={p.y} r="3.5" fill={p.value >= 0 ? "#6ee7b7" : "#fda4af"} stroke="#10263b" strokeWidth="1.5"/><title>{p.label}: {p.value.toFixed(2)}R cumulative · {p.count} closed records</title></g>)}
          </svg>
          <div className="flex justify-between gap-2">{chartPoints.map((p,i) => <span key={p.label} className={"min-w-0 truncate text-[9px] text-slate-500 " + (i !== 0 && i !== chartPoints.length - 1 && chartPoints.length > 4 ? "hidden sm:block" : "")}>{p.label}</span>)}</div>
        </div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center"><p className="text-xs font-medium text-slate-300">Not enough closed trade results yet</p><p className="mt-1 text-[10px] text-slate-500">Enter realized R on completed trades to build this timeline.</p></div>}
      </div>
      <div className="rounded-2xl border border-white/[.08] bg-[#0d1b2d] p-4 sm:p-5">
        <p className="text-[9px] font-bold uppercase tracking-[.16em] text-violet-200/70">Market breakdown</p><h3 className="mt-1 text-sm font-semibold text-white">Profitability by market</h3><p className="mt-1 text-[10px] text-slate-500">Realized R from closed, scored records</p>
        {marketResults.length ? <div className="mt-4 space-y-4">{marketResults.map(m => <div key={m.name}><div className="mb-1.5 flex items-center justify-between gap-2"><span className="truncate text-[10px] font-medium text-slate-200">{pretty(m.name)}</span><span className={"text-[10px] font-semibold tabular-nums " + (m.total > 0 ? "text-emerald-200" : m.total < 0 ? "text-rose-200" : "text-amber-200")}>{m.total > 0 ? "+" : ""}{m.total.toFixed(2)}R <span className="font-normal text-slate-500">· {m.count}</span></span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className={"h-full rounded-full " + (m.total >= 0 ? "bg-emerald-300" : "bg-rose-300")} style={{ width: Math.max(3, Math.abs(m.total) / maxMarketAbs * 100) + "%" }}/></div></div>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 px-3 py-7 text-center text-[10px] text-slate-500">Market results appear when closed trades have realized R.</p>}
      </div>
    </div>

    <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-white/[.08] bg-[#0d1b2d] p-4">
        <div className="flex items-center justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-amber-200/70">Trading activity</p><h3 className="mt-1 text-sm font-semibold text-white">{now.toLocaleDateString("en", { month: "long", year: "numeric" })}</h3></div><span className="rounded-lg bg-amber-200/10 px-2.5 py-1.5 text-[10px] font-semibold text-amber-100">{thisMonthRecords} active days</span></div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">{["M","T","W","T","F","S","S"].map((d,i)=><span key={d+i} className="pb-1 text-[9px] font-semibold text-slate-500">{d}</span>)}{Array.from({length:monthOffset},(_,i)=><span key={"blank"+i}/>)}{Array.from({length:monthDays},(_,i)=>{const day=i+1;const active=activityDays.has(day);return <span key={day} className={"flex aspect-square items-center justify-center rounded-lg text-[10px] " + (active ? "border border-cyan-200/20 bg-cyan-200/15 font-bold text-cyan-100" : "bg-white/[.025] text-slate-500")}>{day}</span>})}</div>
        <p className="mt-3 text-[9px] text-slate-500">Highlighted days contain at least one saved journal entry. This is activity tracking, not proof of execution quality.</p>
      </div>
      <div className="rounded-2xl border border-white/[.08] bg-[#0d1b2d] p-4">
        <p className="text-[9px] font-bold uppercase tracking-[.16em] text-emerald-200/70">Consistency tracker</p><h3 className="mt-1 text-sm font-semibold text-white">Build a repeatable process</h3>
        <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/[.06] bg-white/[.025] p-3"><p className="text-[9px] text-slate-500">Active days this month</p><p className="mt-1 text-xl font-semibold text-white tabular-nums">{thisMonthRecords}</p></div><div className="rounded-xl border border-white/[.06] bg-white/[.025] p-3"><p className="text-[9px] text-slate-500">Weeks with records</p><p className="mt-1 text-xl font-semibold text-white tabular-nums">{activeWeeks}</p></div></div>
        <div className="mt-3 rounded-xl border border-emerald-200/10 bg-emerald-200/[.04] p-3"><p className="text-[10px] font-semibold text-emerald-100">Process over frequency</p><p className="mt-1 text-[10px] leading-5 text-slate-400">Use this calendar to review whether you document decisions consistently. More trades do not automatically mean better trading.</p></div>
      </div>
    </div>

    <div className="mt-3 grid gap-3 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-2xl border border-white/[.08] bg-[#0d1b2d] p-4">
        <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-slate-100">Journal composition</h3><span className="text-[9px] text-slate-500">Latest 30</span></div>
        <div className="mt-4 space-y-3">{statusCounts.map(s => <div key={s.label}><div className="mb-1.5 flex items-center justify-between text-[10px]"><span className={s.text}>{s.label}</span><span className="tabular-nums text-slate-400">{s.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className={"h-full rounded-full " + s.color} style={{ width: (s.count / maxStatus * 100) + "%" }} /></div></div>)}</div>
        <p className="mt-4 border-t border-white/[.06] pt-3 text-[9px] leading-4 text-slate-500">Composition is calculated from your loaded private records. It is not a broker statement or independently verified account history.</p>
      </div>
      <div className="rounded-2xl border border-white/[.08] bg-[#0d1b2d] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-semibold text-slate-100">Find a trade</h3><span className="text-[9px] text-slate-500">{filtered.length} matching records</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search instrument, thesis or event..." aria-label="Search journal" className="min-w-0 rounded-lg border border-white/10 bg-[#071525] px-3 py-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-200/40" />
          <select value={market} onChange={e => setMarket(e.target.value)} aria-label="Filter by market" className="rounded-lg border border-white/10 bg-[#071525] px-3 py-2.5 text-xs text-slate-200"><option value="all">All markets</option>{markets.map(m => <option key={m} value={m}>{pretty(m)}</option>)}</select>
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort journal" className="rounded-lg border border-white/10 bg-[#071525] px-3 py-2.5 text-xs text-slate-200"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="best">Best R first</option><option value="worst">Worst R first</option></select>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{filters.map(f => <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={"rounded-lg border px-3 py-2 text-[10px] font-semibold " + (filter === f.id ? "border-cyan-200/30 bg-cyan-200/10 text-cyan-100" : "border-white/[.07] bg-white/[.025] text-slate-400 hover:border-white/20 hover:text-slate-200")}>{f.label}</button>)}</div>
      </div>
    </div>

    <div className="mt-4 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-100">Trade records</h3><span className="text-[10px] text-slate-500">Private to your account</span></div>
    {filtered.length ? <div className="mt-3 grid gap-3 xl:grid-cols-2">{filtered.map(trade => {
      const isExpanded = expanded === trade.id;
      const screenshot = screenshots[trade.id];
      const result = trade.realized_r === null ? null : Number(trade.realized_r);
      return <article key={trade.id} className="group min-w-0 overflow-hidden rounded-2xl border border-white/[.09] bg-[linear-gradient(145deg,#12243a,#0b192a)] shadow-[0_14px_34px_rgba(0,0,0,.16)] transition hover:border-cyan-200/20">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-300/80 via-blue-400/70 to-violet-400/70" />
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="rounded-md border border-white/[.08] bg-white/[.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-300">{pretty(trade.market)}</span><span className={"rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider " + statusTone(trade.status)}>{pretty(trade.status)}</span></div><h4 className="mt-3 break-words text-xl font-semibold tracking-tight text-white">{trade.instrument}</h4><p className="mt-1 text-[10px] text-slate-500">{pretty(trade.direction)} · {new Date(trade.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p></div>
            <div className="text-right"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Realized result</p><p className={"mt-1 text-lg font-semibold tabular-nums " + (result === null ? "text-slate-400" : result > 0 ? "text-emerald-200" : result < 0 ? "text-rose-200" : "text-amber-200")}>{result === null ? "Not entered" : (result > 0 ? "+" : "") + result.toFixed(2) + "R"}</p></div>
          </div>
          {trade.news_trade_attribution === "direct_news" && <p className="mt-3 rounded-lg border border-violet-200/15 bg-violet-200/[.05] px-3 py-2 text-[10px] text-violet-100">News trade · {trade.news_event_type || "Event"}{trade.news_event_name ? " · " + trade.news_event_name : ""}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl border border-white/[.06] bg-black/15 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-500">Entry</p><p className="mt-1 break-words text-sm font-semibold tabular-nums text-slate-100">{trade.entry_price ?? "—"}</p></div><div className="rounded-xl border border-rose-200/[.08] bg-rose-200/[.025] p-3"><p className="text-[9px] uppercase tracking-wider text-rose-200/65">Stop loss</p><p className="mt-1 break-words text-sm font-semibold tabular-nums text-slate-100">{trade.stop_loss ?? "—"}</p></div><div className="col-span-2 rounded-xl border border-white/[.06] bg-white/[.025] p-3 sm:col-span-1"><p className="text-[9px] uppercase tracking-wider text-slate-500">Record type</p><p className="mt-1 text-xs font-semibold text-slate-200">{trade.news_trade_attribution === "direct_news" ? "Direct news trade" : trade.news_trade_attribution === "event_context" ? "Event context" : "Standard journal"}</p></div></div>
          {screenshot && <img src={screenshot} alt={trade.instrument + " private trade chart"} className="mt-3 max-h-52 w-full rounded-xl border border-white/10 bg-black/20 object-contain" />}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.07] pt-3"><button type="button" onClick={() => setExpanded(isExpanded ? null : trade.id)} className="rounded-lg border border-cyan-200/15 bg-cyan-200/[.05] px-3 py-2 text-[10px] font-semibold text-cyan-100">{isExpanded ? "Hide analysis ↑" : "Expand analysis ↓"}</button><div className="flex flex-wrap items-center gap-2"><Link href={"/journal/" + trade.id} className="text-[10px] font-semibold text-cyan-200 hover:text-cyan-100">Full record ↗</Link><Link href={"/journal/" + trade.id + "/edit"} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-300 hover:border-blue-200/30 hover:text-blue-100">Edit</Link><RecordDeleteButton kind="journal" id={trade.id} /></div></div>
          {isExpanded && <div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Trade thesis", trade.thesis], ["Fundamental analysis", trade.fundamental_analysis], ["Intermarket analysis", trade.intermarket_analysis]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/[.06] bg-[#081525]/70 p-3"><h5 className="text-[9px] font-bold uppercase tracking-wider text-cyan-200/80">{label}</h5><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{value || "No notes recorded."}</p></div>)}</div>}
      </div></article>;
    })}</div> : <div className="mt-3 rounded-2xl border border-dashed border-white/15 bg-[#0d1b2d] px-5 py-10 text-center"><p className="text-sm font-semibold text-slate-200">{trades.length ? "No matching trades" : "Your journal starts here"}</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">{trades.length ? "Try another search term or clear one of the filters." : "Record your first trade to start building a private, evidence-based performance history."}</p>{!trades.length && <Link href="/journal/new" className="mt-4 inline-flex rounded-lg bg-cyan-200 px-4 py-2.5 text-xs font-bold text-[#082033]">＋ Record your first trade</Link>}</div>}
    <p className="mt-3 text-[9px] leading-5 text-slate-600">Journal data reflects information you entered. Performance metrics are descriptive calculations, not independently audited results or a statement from your broker. Showing the latest 30 private records loaded for this journal workspace.</p>
  </section>;
}
