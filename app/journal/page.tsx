import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TerminalTopNav from "@/app/dashboard/terminal-top-nav";
import JournalWorkspace from "@/components/journal-workspace";

function JournalMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "cyan" | "green" | "blue" | "amber" }) {
  const styles = {
    cyan: "border-cyan-200/15 bg-cyan-300/[.06] text-cyan-100",
    green: "border-emerald-200/15 bg-emerald-300/[.06] text-emerald-100",
    blue: "border-blue-200/15 bg-blue-300/[.06] text-blue-100",
    amber: "border-amber-200/15 bg-amber-300/[.06] text-amber-100",
  };
  return <div className={"rounded-2xl border p-4 " + styles[tone]}>
    <p className="text-[9px] font-bold uppercase tracking-[.16em] opacity-75">{label}</p>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
    <p className="mt-1 text-[10px] leading-5 text-slate-400">{detail}</p>
  </div>;
}

export default async function TradingJournalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: premiumAccess }, analyticsResult, tradeResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.rpc("has_premium_access", { check_user_id: user.id }),
    supabase.from("private_trades").select("id,market,status,created_at,realized_r", { count: "exact" }).order("created_at", { ascending: false }).limit(1000),
    supabase.from("private_trades").select("id,instrument,market,direction,status,created_at,entry_price,stop_loss,thesis,fundamental_analysis,intermarket_analysis,news_trade_attribution,news_event_type,news_event_name,realized_r").order("created_at", { ascending: false }).limit(30),
  ]);

  const isAdmin = profile?.role === "admin";
  const hasPremium = Boolean(premiumAccess) || isAdmin;
  const analyticsTrades = analyticsResult.data ?? [];
  const trades = tradeResult.data ?? [];
  const closed = analyticsTrades.filter(t => ["all_targets_hit", "stopped_out", "breakeven", "closed_manually"].includes(t.status || "") && t.realized_r !== null);
  const wins = closed.filter(t => Number(t.realized_r) > 0).length;
  const losses = closed.filter(t => Number(t.realized_r) < 0).length;
  const netR = closed.reduce((sum, t) => sum + Number(t.realized_r || 0), 0);
  const grossProfitR = closed.filter(t => Number(t.realized_r) > 0).reduce((sum, t) => sum + Number(t.realized_r), 0);
  const grossLossR = Math.abs(closed.filter(t => Number(t.realized_r) < 0).reduce((sum, t) => sum + Number(t.realized_r), 0));
  const profitFactor = grossLossR > 0 ? grossProfitR / grossLossR : grossProfitR > 0 ? Infinity : null;
  const winRate = wins + losses ? Math.round(wins / (wins + losses) * 100) : null;
  const active = analyticsTrades.filter(t => t.status === "in_progress").length;
  const marketResults = [...new Set(closed.map(t => t.market || "other"))].map(market => {
    const rows = closed.filter(t => (t.market || "other") === market);
    const marketWins = rows.filter(t => Number(t.realized_r) > 0).length;
    const marketLosses = rows.filter(t => Number(t.realized_r) < 0).length;
    return {
      market,
      count: rows.length,
      net: rows.reduce((sum, t) => sum + Number(t.realized_r || 0), 0),
      winRate: marketWins + marketLosses ? Math.round(marketWins / (marketWins + marketLosses) * 100) : null,
    };
  }).sort((a, b) => b.count - a.count);

  const tradeIds = trades.map(t => t.id);
  const { data: images } = tradeIds.length
    ? await supabase.from("images").select("id,private_trade_id,storage_path").in("private_trade_id", tradeIds).eq("owner_id", user.id).eq("visibility", "private")
    : { data: [] as { id: string; private_trade_id: string; storage_path: string }[] };
  const imageByTrade = new Map<string, string>();
  for (const image of images ?? []) {
    const { data } = await supabase.storage.from("trade-journal").createSignedUrl(image.storage_path, 3600);
    if (data?.signedUrl && !imageByTrade.has(image.private_trade_id)) imageByTrade.set(image.private_trade_id, data.signedUrl);
  }

  return <main className="relative min-h-screen overflow-hidden bg-[#07111f] px-3 py-4 text-slate-100 sm:px-5 sm:py-6 lg:px-8">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(34,211,238,.09),transparent_34%),radial-gradient(ellipse_at_90%_18%,rgba(59,130,246,.07),transparent_30%)]" />
    <div className="relative z-10 mx-auto max-w-[1480px]">
      <TerminalTopNav isPremium={hasPremium} isAdmin={isAdmin} />
      <section className="mt-5 overflow-hidden rounded-[26px] border border-cyan-200/15 bg-[radial-gradient(ellipse_at_95%_0%,rgba(34,211,238,.14),transparent_36%),linear-gradient(125deg,#12334c_0%,#10263d_48%,#101b2d_100%)] p-5 shadow-[0_24px_65px_rgba(0,0,0,.22)] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200/75">AIS private workspace</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">My Trading Journal</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">A dedicated workspace for recording trades, reviewing execution, measuring realized outcomes and improving consistency.</p></div>
          <Link href="/journal/new" className="rounded-xl bg-cyan-200 px-4 py-3 text-xs font-bold text-[#082033] shadow-[0_8px_24px_rgba(34,211,238,.14)] transition hover:bg-cyan-100">＋ Record a trade</Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-[9px] font-semibold uppercase tracking-[.14em] text-slate-400"><span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2">Private to your account</span><span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2">Execution analytics</span><span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2">Trade evidence & notes</span></div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200/70">Performance overview</p><h2 className="mt-1 text-lg font-semibold text-slate-100">Your recorded results</h2></div><span className="text-[9px] text-slate-500">Latest {analyticsTrades.length.toLocaleString("en-NG")} of {Number(analyticsResult.count ?? analyticsTrades.length).toLocaleString("en-NG")} records</span></div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <JournalMetric label="Closed trades" value={String(closed.length)} detail={wins + " wins · " + losses + " losses"} tone="blue" />
          <JournalMetric label="Win rate" value={winRate === null ? "—" : winRate + "%"} detail="Breakeven excluded" tone="green" />
          <JournalMetric label="Profit factor" value={profitFactor === null ? "—" : Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"} detail="Gross profit R ÷ gross loss R" tone="cyan" />
          <JournalMetric label="Net realized R" value={closed.length ? (netR > 0 ? "+" : "") + netR.toFixed(2) + "R" : "—"} detail={active + " currently open · latest 1,000 records at most"} tone="amber" />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-white/[.08] bg-[#0d1b2d] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet-200/70">Market analysis</p><h2 className="mt-1 text-sm font-semibold text-white">Performance by market</h2><p className="mt-1 text-[10px] text-slate-500">Closed records with an entered realized R result</p></div><span className="text-[9px] text-slate-500">Breakeven excluded from win rate</span></div>
        {marketResults.length ? <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{marketResults.map(item => <div key={item.market} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3.5"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.market.replaceAll("_", " ")}</p><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[9px] text-slate-500">Closed</p><p className="mt-1 text-sm font-semibold tabular-nums text-slate-200">{item.count}</p></div><div className="text-right"><p className="text-[9px] text-slate-500">Net realized</p><p className={"mt-1 text-sm font-semibold tabular-nums " + (item.net > 0 ? "text-emerald-200" : item.net < 0 ? "text-rose-200" : "text-slate-200")}>{item.net > 0 ? "+" : ""}{item.net.toFixed(2)}R</p></div></div><div className="mt-3 flex justify-between border-t border-white/[.06] pt-2 text-[10px]"><span className="text-slate-500">Win rate</span><span className="font-semibold text-slate-300">{item.winRate === null ? "—" : item.winRate + "%"}</span></div></div>)}</div> : <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-500">Market performance will appear when completed trades have a recorded realized R.</p>}
        <p className="mt-3 text-[9px] leading-5 text-slate-500">Metrics are calculations from your saved journal records, not independently audited broker results. Open, cancelled and unscored records are excluded from realized performance.</p>
      </section>

      <JournalWorkspace trades={trades} screenshots={Object.fromEntries(imageByTrade)} />
      <footer className="mt-8 border-t border-white/[.07] py-5 text-center text-[10px] text-slate-600">AIS PRIVATE JOURNAL · Your records and screenshots remain subject to your account's existing access controls.</footer>
    </div>
  </main>;
}
