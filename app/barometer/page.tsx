import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TradeRow = {
  id: string;
  instrument: string;
  direction: string;
  status: string;
  realized_r: number | string | null;
  news_event_type: string | null;
  news_event_name: string | null;
  news_event_at: string | null;
  closed_at: string | null;
  created_at: string;
};

type SearchParams = { from?: string; to?: string };

function summarize(rows: TradeRow[]) {
  const values = rows.map((row) => Number(row.realized_r));
  const wins = values.filter((value) => value > 0);
  const losses = values.filter((value) => value < 0);
  const breakeven = values.filter((value) => value === 0).length;
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const decisive = wins.length + losses.length;
  return {
    total: rows.length,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRate: decisive ? (wins.length / decisive) * 100 : null,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? null : null,
    grossProfit,
    grossLoss,
    netR: values.reduce((sum, value) => sum + value, 0),
    averageR: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
  };
}

function groupRows(rows: TradeRow[], key: (row: TradeRow) => string) {
  const groups = new Map<string, TradeRow[]>();
  for (const row of rows) {
    const name = key(row) || "Unclassified";
    groups.set(name, [...(groups.get(name) || []), row]);
  }
  return [...groups.entries()]
    .map(([name, items]) => ({ name, ...summarize(items) }))
    .sort((a, b) => b.total - a.total || b.netR - a.netR);
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#111d2e] p-4">
    <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
  </div>;
}

function PerformanceTable({ title, rows }: { title: string; rows: ReturnType<typeof groupRows> }) {
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111d2e]">
    <div className="border-b border-white/10 px-5 py-4"><h2 className="font-semibold">{title}</h2></div>
    {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
      <thead className="bg-black/15 text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Trades</th><th className="px-4 py-3 font-medium">Win rate</th><th className="px-4 py-3 font-medium">Net R</th><th className="px-4 py-3 font-medium">Avg R</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.name} className="border-t border-white/[.06]">
        <td className="px-4 py-3 font-medium text-slate-200">{row.name}</td>
        <td className="px-4 py-3 tabular-nums text-slate-300">{row.total}</td>
        <td className="px-4 py-3 tabular-nums text-slate-300">{row.winRate === null ? "—" : row.winRate.toFixed(1) + "%"}</td>
        <td className={`px-4 py-3 tabular-nums ${row.netR > 0 ? "text-emerald-300" : row.netR < 0 ? "text-rose-300" : "text-slate-300"}`}>{row.netR > 0 ? "+" : ""}{row.netR.toFixed(2)}R</td>
        <td className="px-4 py-3 tabular-nums text-slate-300">{row.averageR === null ? "—" : (row.averageR > 0 ? "+" : "") + row.averageR.toFixed(2) + "R"}</td>
      </tr>)}</tbody>
    </table></div> : <p className="px-5 py-6 text-sm text-slate-500">No completed news trades in this category yet.</p>}
  </section>;
}

export default async function NewsTradingBarometerPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let allRows: TradeRow[] = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const { data, error } = await supabase
      .from("private_trades")
      .select("id,instrument,direction,status,realized_r,news_event_type,news_event_name,news_event_at,closed_at,created_at")
      .eq("news_trade_attribution", "direct_news")
      .in("status", ["all_targets_hit", "stopped_out", "breakeven", "closed_manually"])
      .not("realized_r", "is", null)
      .order("closed_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + 999);
    if (error) throw new Error("Unable to load your private news-trading records.");
    const page = (data || []) as TradeRow[];
    allRows = allRows.concat(page);
    if (page.length < 1000) break;
  }

  const from = searchParams.from ? new Date(searchParams.from + "T00:00:00") : null;
  const to = searchParams.to ? new Date(searchParams.to + "T23:59:59.999") : null;
  const rows = allRows.filter((row) => {
    const date = new Date(row.closed_at || row.created_at);
    return (!from || date >= from) && (!to || date <= to);
  });
  const stats = summarize(rows);
  const byEvent = groupRows(rows, (row) => row.news_event_type || "Unclassified");
  const byInstrument = groupRows(rows, (row) => row.instrument);
  const byDirection = groupRows(rows, (row) => row.direction.toUpperCase());
  const byRelease = groupRows(rows, (row) => row.news_event_name || row.news_event_type || "Unclassified");
  const monthly = groupRows(rows, (row) => {
    const date = new Date(row.closed_at || row.created_at);
    return date.toLocaleString("en", { month: "short", year: "numeric" });
  }).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  return <main className="min-h-screen px-4 py-8 text-slate-100 md:px-10 md:py-10">
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard" className="text-xs font-semibold tracking-wider text-cyan-200">← MEMBER WORKSPACE</Link>
      <header className="mt-6 rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-[#14253a] via-[#0d1728] to-[#14253a] p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Trading performance analytics</p>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">News Trading Barometer</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">A private, evidence-based record of how your trades perform around economic releases. Only trades explicitly classified as direct news trades are included.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300"><span className="rounded-full border border-white/10 px-3 py-1.5">NFP · CPI · PCE · FOMC</span><span className="rounded-full border border-white/10 px-3 py-1.5">Win rate · Profit factor · R-multiple</span><span className="rounded-full border border-white/10 px-3 py-1.5">Private to your account</span></div>
      </header>

      <form method="get" className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-[#111d2e] p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="text-xs text-slate-400">Closed from<input type="date" name="from" defaultValue={searchParams.from || ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1422] px-3 py-3 text-sm text-slate-100"/></label>
        <label className="text-xs text-slate-400">Closed to<input type="date" name="to" defaultValue={searchParams.to || ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1422] px-3 py-3 text-sm text-slate-100"/></label>
        <button className="rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">Apply</button>
        <Link href="/barometer" className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-slate-300">Reset</Link>
      </form>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="News-trade win rate" value={stats.winRate === null ? "—" : stats.winRate.toFixed(1) + "%"} note={`${stats.wins} wins · ${stats.losses} losses · ${stats.breakeven} breakeven`}/>
        <Metric label="Profit factor" value={stats.grossProfit > 0 && stats.grossLoss === 0 ? "∞" : stats.profitFactor === null ? "—" : stats.profitFactor.toFixed(2)} note="Gross winning R ÷ gross losing R"/>
        <Metric label="Net performance" value={(stats.netR > 0 ? "+" : "") + stats.netR.toFixed(2) + "R"} note={`${stats.total} completed news trades`}/>
        <Metric label="Average result" value={stats.averageR === null ? "—" : (stats.averageR > 0 ? "+" : "") + stats.averageR.toFixed(2) + "R"} note="Average realized R per completed trade"/>
      </section>

      <div className="mt-4 rounded-xl border border-white/10 bg-[#0e1929] p-4 text-xs leading-6 text-slate-400">
        <strong className="text-slate-200">Calculation rules:</strong> Win rate = wins ÷ (wins + losses); breakeven is excluded from that denominator. Profit factor and average R use the final realized R entered in the journal. Open, cancelled, unclassified and completed trades without a realized R are excluded. Historical trades are not automatically classified as news trades.
      </div>

      {!rows.length && <section className="mt-5 rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/[.03] p-7 text-center">
        <h2 className="text-lg font-semibold">Your Barometer is ready for its first results</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Record a trade in your journal, select “Direct news trade”, identify the release, and enter its final realized R when you close it. Your performance statistics will populate here automatically.</p>
        <Link href="/journal/new" className="mt-5 inline-flex rounded-lg bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">Record a news trade</Link>
      </section>}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <PerformanceTable title="Performance by event category" rows={byEvent}/><PerformanceTable title="Performance by specific release" rows={byRelease}/>
        <PerformanceTable title="Performance by instrument" rows={byInstrument}/>
        <PerformanceTable title="Long versus Short" rows={byDirection}/>
        <PerformanceTable title="Monthly performance" rows={monthly}/>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111d2e] p-5">
        <div><h2 className="font-semibold">Keep your journal current</h2><p className="mt-1 text-xs text-slate-400">Accurate results depend on recording the final combined R after partial exits and fees.</p></div>
        <Link href="/journal/new" className="rounded-lg border border-cyan-300/30 px-4 py-2.5 text-sm font-semibold text-cyan-200">＋ Record trade</Link>
      </div>
    </div>
  </main>;
}
