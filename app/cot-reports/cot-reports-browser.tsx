"use client";

import { useMemo, useState } from "react";

type CotReport = {
  id: string;
  title: string;
  market: string;
  report_date: string;
  report_type: string;
  managed_money_long: number | null;
  managed_money_short: number | null;
  managed_money_net: number | null;
  weekly_net_change: number | null;
  open_interest: number | null;
  summary: string | null;
  source_url: string | null;
  published_at: string | null;
  access_level: string;
};

function formatNumber(value: number | null) {
  return value === null ? "—" : Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-NG", { dateStyle: "long" });
}

export default function CotReportsBrowser({ reports }: { reports: CotReport[] }) {
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("all");
  const [audience, setAudience] = useState("all");

  const markets = useMemo(
    () => Array.from(new Set(reports.map((report) => report.market))).sort((a, b) => a.localeCompare(b)),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesMarket = market === "all" || report.market === market;
      const matchesAudience = audience === "all" || report.access_level === audience;
      const haystack = [report.title, report.market, report.summary ?? "", report.report_date].join(" ").toLowerCase();
      return matchesMarket && matchesAudience && (!term || haystack.includes(term));
    });
  }, [reports, search, market, audience]);

  return (
    <>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#101e30] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Published reports</p>
          <p className="mt-1 text-2xl font-semibold">{reports.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#101e30] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Markets covered</p>
          <p className="mt-1 text-2xl font-semibold">{markets.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#101e30] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Matching reports</p>
          <p className="mt-1 text-2xl font-semibold">{filteredReports.length}</p>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-white/10 bg-[#101e30] p-4 sm:p-5" aria-label="Filter COT reports">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_190px]">
          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">Search reports</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, market or summary…" className="w-full rounded-xl border border-white/10 bg-[#091625] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">Market</span>
            <select value={market} onChange={(event) => setMarket(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#091625] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50">
              <option value="all">All markets</option>
              {markets.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">Access</span>
            <select value={audience} onChange={(event) => setAudience(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#091625] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50">
              <option value="all">All available</option>
              <option value="free">Member research</option>
              <option value="premium">Premium research</option>
            </select>
          </label>
        </div>
        {(search || market !== "all" || audience !== "all") && <button type="button" onClick={() => { setSearch(""); setMarket("all"); setAudience("all"); }} className="mt-3 text-xs text-cyan-200 hover:text-cyan-100">Clear filters</button>}
      </section>

      {filteredReports.length ? (
        <div className="mt-5 grid gap-4">
          {filteredReports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-white/10 bg-[#101e30] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">{report.market} · {report.report_type === "futures_and_options" ? "Futures + options" : "Futures only"}</p>
                  <h2 className="mt-2 text-xl font-semibold">{report.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">Report date: {formatDate(report.report_date)}</p>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1 text-[10px] text-emerald-200">{report.access_level === "free" ? "Member research" : "Premium research"}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ["Managed Money Long", report.managed_money_long],
                  ["Managed Money Short", report.managed_money_short],
                  ["Managed Money Net", report.managed_money_net],
                  ["Weekly net change", report.weekly_net_change],
                  ["Open interest", report.open_interest],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-black/20 p-3">
                    <p className="text-[10px] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{formatNumber(value as number | null)}</p>
                  </div>
                ))}
              </div>
              {report.summary && <div className="mt-5"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Positioning overview</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{report.summary}</p></div>}
              {report.source_url && <a href={report.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-cyan-200 underline">View original source ↗</a>}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-[#101e30] p-8 text-center">
          <h2 className="font-semibold text-slate-200">{reports.length ? "No matching COT reports" : "No COT reports published yet"}</h2>
          <p className="mt-2 text-sm text-slate-500">{reports.length ? "Try changing your search or filters." : "When the research desk publishes a weekly report for your membership level, it will appear here."}</p>
        </div>
      )}
    </>
  );
}
