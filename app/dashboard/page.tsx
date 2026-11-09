import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecordDeleteButton from "@/components/record-delete-button";
import TerminalTopNav from "./terminal-top-nav";

function Metric({ label, value, detail, accent = "cyan" }: { label: string; value: string; detail: string; accent?: "cyan" | "blue" | "green" | "amber" }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[.06] text-cyan-200",
    blue: "border-blue-300/15 bg-blue-300/[.06] text-blue-200",
    green: "border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200",
    amber: "border-amber-300/15 bg-amber-300/[.06] text-amber-200",
  };
  return <div className={`group relative overflow-hidden rounded-[20px] border p-5 shadow-[0_16px_40px_rgba(0,0,0,.18)] transition duration-200 hover:-translate-y-1 hover:border-white/20 ${tones[accent]}`}>
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50" />
    <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[.17em] opacity-75">{label}</p><span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" /></div>
    <p className="mt-3 text-[clamp(1.45rem,2vw,1.9rem)] font-semibold tracking-tight text-slate-50">{value}</p>
    <p className="mt-1 text-[11px] leading-5 text-slate-400">{detail}</p>
  </div>;
}

function PanelHeading({ eyebrow, title, href, linkText }: { eyebrow: string; title: string; href?: string; linkText?: string }) {
  return <div className="mb-4 flex items-end justify-between gap-3">
    <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200/70">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-slate-100">{title}</h2></div>
    {href && <Link href={href} className="shrink-0 text-xs font-medium text-cyan-200 hover:text-cyan-100">{linkText || "View all"} ↗</Link>}
  </div>;
}

function QuickLink({ href, icon, title, description, locked = false }: { href: string; icon: string; title: string; description: string; locked?: boolean }) {
  return <Link href={href} className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/[.07] bg-[#0b1728] p-3.5 transition hover:border-cyan-300/25 hover:bg-cyan-300/[.035]">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/10 bg-cyan-200/[.07] text-lg text-cyan-100">{icon}</span>
    <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">{title}{locked && <span className="rounded bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-amber-200">PREMIUM</span>}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
    <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-200">↗</span>
  </Link>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center text-xs leading-5 text-slate-500">{children}</div>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role,username,display_name").eq("id", user.id).maybeSingle();
  const { data: premiumAccess } = await supabase.rpc("has_premium_access", { check_user_id: user.id });
  const isAdmin = profile?.role === "admin";
  const hasPremium = Boolean(premiumAccess) || isAdmin;

  const [journalAnalyticsResult, tradeResult, publicTradeResult, eventResult, researchResult] = await Promise.all([
    supabase.from("private_trades").select("id,instrument,market,direction,status,created_at,closed_at,realized_r", { count: "exact" }).order("created_at", { ascending: false }).limit(1000),
    supabase.from("private_trades").select("id,instrument,market,direction,status,created_at,entry_price,stop_loss,thesis,fundamental_analysis,intermarket_analysis,news_trade_attribution,news_event_type,news_event_name,realized_r").order("created_at", { ascending: false }).limit(30),
    supabase.from("public_trades").select("id,slug,instrument,market,direction,status,entry_price,stop_loss,thesis,published_at,created_at").eq("content_state", "published").order("published_at", { ascending: false }).limit(4),
    supabase.from("news_setups").select("id,title,event_type,event_name,release_at,phase,trade_bias,access_level,research_category,market_focus,published_at").eq("publication_status", "published").in("access_level", hasPremium ? ["free", "premium"] : ["free"]).order("published_at", { ascending: false }).limit(4),
    (() => {
      let query = supabase.from("analysis_articles").select("id,slug,title,excerpt,category,is_premium_only,published_at").eq("content_state", "published");
      if (!hasPremium) query = query.eq("is_premium_only", false);
      return query.order("published_at", { ascending: false }).limit(3);
    })(),
  ]);

  const trades = tradeResult.data ?? [];
  const analyticsTrades = journalAnalyticsResult.data ?? [];
  const closedTrades = analyticsTrades.filter(t => ["all_targets_hit", "stopped_out", "breakeven", "closed_manually"].includes(t.status) && t.realized_r !== null);
  const wins = closedTrades.filter(t => Number(t.realized_r) > 0).length;
  const netR = closedTrades.reduce((sum, t) => sum + Number(t.realized_r || 0), 0);
  const winRate = wins + closedTrades.filter(t => Number(t.realized_r) < 0).length ? Math.round((wins / (wins + closedTrades.filter(t => Number(t.realized_r) < 0).length)) * 100) : null;
  const activeTrades = analyticsTrades.filter(t => t.status === "in_progress").length;
  const losses = closedTrades.filter(t => Number(t.realized_r) < 0).length;
  const breakevenTrades = closedTrades.filter(t => Number(t.realized_r) === 0).length;
  const grossProfitR = closedTrades.filter(t => Number(t.realized_r) > 0).reduce((sum, t) => sum + Number(t.realized_r), 0);
  const grossLossR = Math.abs(closedTrades.filter(t => Number(t.realized_r) < 0).reduce((sum, t) => sum + Number(t.realized_r), 0));
  const profitFactor = grossLossR > 0 ? grossProfitR / grossLossR : grossProfitR > 0 ? Infinity : null;
  const marketPerformance = [...new Set(closedTrades.map(t => t.market || "other"))].map(market => {
    const rows = closedTrades.filter(t => (t.market || "other") === market);
    const marketWins = rows.filter(t => Number(t.realized_r) > 0).length;
    const marketLosses = rows.filter(t => Number(t.realized_r) < 0).length;
    const net = rows.reduce((sum, t) => sum + Number(t.realized_r || 0), 0);
    return { market, count: rows.length, winRate: marketWins + marketLosses ? Math.round(marketWins / (marketWins + marketLosses) * 100) : null, net };
  }).sort((a, b) => b.count - a.count).slice(0, 4);
  const tradeIds = trades.map(t => t.id);
  const { data: images } = tradeIds.length
    ? await supabase.from("images").select("id,private_trade_id,storage_path").in("private_trade_id", tradeIds).eq("owner_id", user.id).eq("visibility", "private")
    : { data: [] as { id: string; private_trade_id: string; storage_path: string }[] };
  const imageByTrade = new Map<string, string>();
  for (const image of images ?? []) {
    const { data } = await supabase.storage.from("trade-journal").createSignedUrl(image.storage_path, 3600);
    if (data?.signedUrl && !imageByTrade.has(image.private_trade_id)) imageByTrade.set(image.private_trade_id, data.signedUrl);
  }

  const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Trader";
  const events = eventResult.data ?? [];
  const research = researchResult.data ?? [];
  const publicCalls = publicTradeResult.data ?? [];
  const now = Date.now();
  const upcomingEvents = events
    .filter(event => event.release_at && new Date(event.release_at).getTime() >= now)
    .sort((a, b) => new Date(a.release_at!).getTime() - new Date(b.release_at!).getTime());
  const nextEvent = upcomingEvents[0] ?? null;
  const marketCoverage = [...new Set([
    ...analyticsTrades.map(t => t.market),
    ...publicCalls.map(call => call.market),
    ...events.map(event => event.market_focus),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(value => value.trim().replaceAll("_", " ")))].sort((a, b) => a.localeCompare(b));
  const latestResearch = research[0] ?? null;

  return <main className="relative min-h-screen overflow-hidden bg-[#07111f] px-3 py-4 text-slate-100 sm:px-5 sm:py-6 lg:px-8">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(34,211,238,.09),transparent_34%),radial-gradient(ellipse_at_90%_18%,rgba(59,130,246,.07),transparent_30%)]" />
    <div className="relative z-10 mx-auto max-w-[1480px]">
      <TerminalTopNav isPremium={hasPremium} isAdmin={isAdmin} />

      <div className="mt-5 min-w-0">
      <section id="overview" aria-label="Dashboard overview" className="mt-5">
        <div className="relative overflow-hidden rounded-[26px] border border-cyan-200/20 bg-[radial-gradient(ellipse_at_95%_0%,rgba(34,211,238,.15),transparent_35%),linear-gradient(125deg,#12334c_0%,#10263d_48%,#101b2d_100%)] p-6 shadow-[0_24px_65px_rgba(0,0,0,.25)] sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-cyan-200/10" /><div className="pointer-events-none absolute -right-2 -top-6 h-36 w-36 rounded-full border border-cyan-200/10" />
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200/75">Your analyst workspace</p><span className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider ${hasPremium ? "border-emerald-200/20 bg-emerald-200/[.08] text-emerald-100" : "border-white/15 bg-white/[.05] text-slate-300"}`}>{hasPremium ? "Premium access" : "Free membership"}</span></div>
          <h2 className="mt-4 max-w-2xl break-words text-[clamp(1.65rem,3vw,2.35rem)] font-semibold leading-[1.12] tracking-tight">Welcome back, <span className="text-cyan-100">{displayName}</span>.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Your market workspace brings macro context, intermarket confirmation, published analyst ideas and your private execution record together.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Link href="/news-trading" className="rounded-lg bg-cyan-200 px-4 py-2.5 text-xs font-bold text-[#082033] shadow-[0_6px_20px_rgba(34,211,238,.16)] transition hover:-translate-y-0.5 hover:bg-cyan-100">Open Macro Desk ↗</Link><Link href="/journal/new" className="rounded-lg border border-white/15 bg-white/[.05] px-4 py-2.5 text-xs font-semibold text-slate-100 transition hover:border-cyan-100/25 hover:bg-white/[.09]">＋ Record a trade</Link></div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[.09] pt-4 text-[9px] font-semibold uppercase tracking-[.15em] text-slate-400"><span><span className="mr-1.5 text-cyan-200">01</span> Macro context</span><span><span className="mr-1.5 text-cyan-200">02</span> Intermarket confirmation</span><span><span className="mr-1.5 text-cyan-200">03</span> Disciplined execution</span></div>
        </div>
      </section>

      <section aria-label="Workspace shortcuts" className="mt-7">
        <PanelHeading eyebrow="Your workspace" title="Quick access" />
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink href="/macro-radar" icon="◷" title="Macro Event Radar" description="Track upcoming releases and published event scenarios" />
          <QuickLink href="/cot-reports" icon="◎" title="COT Reports" description="Review weekly positioning across key markets" />
          <QuickLink href="/sessions#live-sessions" icon="▶" title="Live Sessions" description="See scheduled analyst sessions and discussions" />
          <QuickLink href="/lounge" icon="◌" title="Community" description="Exchange market perspectives with members" />
        </div>
      </section>

      <section aria-label="Market overview" className="mt-7">
        <PanelHeading eyebrow="Market intelligence" title="Market overview" />
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-cyan-200/10 bg-[linear-gradient(145deg,#10283b,#0d1c2d)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-200/75">Economic Event Radar</p>
              <span className="rounded-full border border-cyan-200/10 bg-cyan-200/[.06] px-2 py-1 text-[9px] text-cyan-100">{events.length} outlooks</span>
            </div>
            {nextEvent ? <>
              <p className="mt-4 text-[10px] uppercase tracking-wider text-slate-500">Next scheduled release in published outlooks</p>
              <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-100">{nextEvent.title}</h3>
              <p className="mt-2 text-xs text-slate-400">{new Date(nextEvent.release_at!).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })} WAT</p>
            </> : <p className="mt-4 text-xs leading-5 text-slate-400">No future release time is currently listed in your published event outlooks.</p>}
            <Link href="/macro-radar" className="mt-4 inline-flex text-xs font-semibold text-cyan-200 hover:text-cyan-100">Open Event Radar ↗</Link>
          </div>
          <div className="min-w-0 rounded-2xl border border-blue-200/10 bg-[linear-gradient(145deg,#14243b,#0d1b2d)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-blue-200/75">Research Pulse</p>
              <span className="rounded-full border border-blue-200/10 bg-blue-200/[.06] px-2 py-1 text-[9px] text-blue-100">{research.length} available</span>
            </div>
            {latestResearch ? <>
              <p className="mt-4 text-[10px] uppercase tracking-wider text-slate-500">Latest accessible publication</p>
              <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-100">{latestResearch.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{latestResearch.excerpt || latestResearch.category.replaceAll("_", " ")}</p>
            </> : <p className="mt-4 text-xs leading-5 text-slate-400">No research publications are currently available for your access level.</p>}
            <Link href="/analysis" className="mt-4 inline-flex text-xs font-semibold text-blue-200 hover:text-blue-100">Open Research Library ↗</Link>
          </div>
          <div className="min-w-0 rounded-2xl border border-emerald-200/10 bg-[linear-gradient(145deg,#102b2b,#0d1d2b)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-200/75">Market Coverage</p>
              <span className="rounded-full border border-emerald-200/10 bg-emerald-200/[.06] px-2 py-1 text-[9px] text-emerald-100">{marketCoverage.length} categories</span>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-wider text-slate-500">Markets represented across your journal, public calls and event outlooks</p>
            {marketCoverage.length ? <div className="mt-3 flex flex-wrap gap-1.5">{marketCoverage.slice(0, 8).map(market => <span key={market} className="rounded-lg border border-emerald-200/10 bg-emerald-200/[.05] px-2.5 py-1.5 text-[10px] capitalize text-emerald-100">{market}</span>)}</div> : <p className="mt-3 text-xs leading-5 text-slate-400">Market categories will appear as journal entries, public calls or event outlooks are added.</p>}
            <p className="mt-3 text-[10px] text-slate-500">Based on saved platform records, not live market feeds.</p>
          </div>
        </div>
      </section>

      <section aria-label="Recent trading performance" className="mt-7 rounded-[22px] border border-white/[.07] bg-[linear-gradient(145deg,rgba(16,34,56,.78),rgba(9,21,37,.88))] p-4 shadow-[0_18px_45px_rgba(0,0,0,.16)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200/70">Performance snapshot</p><h2 className="mt-1 text-lg font-semibold text-slate-100">Trading activity at a glance</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">A concise view of activity and realized outcomes recorded in your private journal.</p></div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/[.08] bg-white/[.035] px-2.5 py-1.5 text-[9px] font-medium text-slate-400">Up to 1,000 latest records</span><Link href="#journal-analytics" className="rounded-lg border border-cyan-200/15 bg-cyan-200/[.05] px-3 py-1.5 text-[10px] font-semibold text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-200/[.09]">Full analytics ↓</Link></div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-4">
          <Metric label="Journal records" value={String(analyticsTrades.length)} detail="Records included in this snapshot" accent="cyan" />
          <Metric label="Open trades" value={String(activeTrades)} detail="Currently marked in progress" accent="blue" />
          <Metric label="Markets tracked" value={String(new Set(analyticsTrades.map(t => t.market).filter(Boolean)).size)} detail="Distinct market categories in this sample" accent="green" />
          <Metric label="Net realized R" value={closedTrades.length ? `${netR > 0 ? "+" : ""}${netR.toFixed(2)}R` : "—"} detail="Closed trades with a recorded realized R" accent="amber" />
        </div>
      </section>

      <section id="journal-analytics" aria-label="Journal performance analytics" className="mt-7 overflow-hidden rounded-[22px] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(16,34,56,.96),rgba(9,25,42,.98))] p-4 shadow-[0_18px_45px_rgba(0,0,0,.2)] sm:p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200/70">Journal analytics</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">Execution performance</h2>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">A closer look at completed trades and realized risk performance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/[.08] bg-white/[.035] px-2.5 py-1.5 text-[9px] font-medium text-slate-400">{analyticsTrades.length.toLocaleString("en-NG")} of {Number(journalAnalyticsResult.count ?? analyticsTrades.length).toLocaleString("en-NG")} records</span>
            <Link href="/barometer" className="rounded-lg border border-cyan-200/15 bg-cyan-200/[.05] px-3 py-1.5 text-[10px] font-semibold text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-200/[.09]">News-trade analytics ↗</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          <div className="rounded-xl border border-blue-200/[.10] bg-blue-300/[.035] p-3 sm:p-3.5"><Metric label="Closed trades" value={String(closedTrades.length)} detail={wins + " wins · " + losses + " losses · " + breakevenTrades + " breakeven"} accent="blue" /></div>
          <div className="rounded-xl border border-emerald-200/[.10] bg-emerald-300/[.035] p-3 sm:p-3.5"><Metric label="Win rate" value={winRate === null ? "—" : String(winRate) + "%"} detail="Breakeven trades excluded" accent="green" /></div>
          <div className="rounded-xl border border-cyan-200/[.10] bg-cyan-300/[.035] p-3 sm:p-3.5"><Metric label="Profit factor" value={profitFactor === null ? "—" : Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"} detail="Gross profit R ÷ gross loss R" accent="cyan" /></div>
          <div className="rounded-xl border border-amber-200/[.10] bg-amber-300/[.035] p-3 sm:p-3.5"><Metric label="Average result" value={closedTrades.length ? ((netR / closedTrades.length) > 0 ? "+" : "") + (netR / closedTrades.length).toFixed(2) + "R" : "—"} detail="Realized R per closed trade" accent="amber" /></div>
        </div>
        <div className="mt-4 rounded-xl border border-white/[.07] bg-[#091525]/80 p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="text-xs font-semibold text-slate-100">Performance by market</h3><p className="mt-1 text-[10px] text-slate-500">Closed trade outcomes grouped by market category</p></div>
            <span className="rounded-full border border-white/[.07] bg-white/[.025] px-2.5 py-1 text-[9px] text-slate-500">Latest 1,000 records at most</span>
          </div>
          {marketPerformance.length ? <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{marketPerformance.map(item => <div key={item.market} className="min-w-0 rounded-xl border border-white/[.07] bg-white/[.025] p-3.5"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.market.replaceAll("_", " ")}</p><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[9px] uppercase tracking-wider text-slate-600">Closed</p><p className="mt-1 text-sm font-semibold tabular-nums text-slate-200">{item.count}</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-wider text-slate-600">Net realized</p><p className={`mt-1 text-sm font-semibold tabular-nums ${item.net > 0 ? "text-emerald-200" : item.net < 0 ? "text-rose-200" : "text-slate-200"}`}>{item.net > 0 ? "+" : ""}{item.net.toFixed(2)}R</p></div></div><div className="mt-3 flex items-center justify-between border-t border-white/[.06] pt-2"><span className="text-[10px] text-slate-500">Win rate</span><span className="text-[10px] font-semibold tabular-nums text-slate-300">{item.winRate === null ? "—" : item.winRate + "%"}</span></div></div>)}</div> : <p className="rounded-lg border border-dashed border-white/[.08] px-3 py-5 text-center text-xs leading-5 text-slate-500">Market performance will appear when completed journal trades have a recorded realized R result.</p>}
        </div>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">Methodology: completed trades with a recorded realized R are included. Win rate excludes breakeven trades. Open, cancelled and unscored trades are excluded. The separate News-trade Barometer includes only trades classified as direct news trades.</p>
      </section>

      <section className="mt-9">
        <PanelHeading eyebrow="Market intelligence" title="Research & event watch" href="/news-trading" linkText="Open Macro Desk" />
        <div className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-cyan-200/10 bg-[linear-gradient(145deg,#102238,#0b192a)] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-200/70">Macro event watch</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-100">Published event scenarios</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Analyst outlooks, event context and directional market bias.</p>
              </div>
              <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[.06] px-3 py-1.5 text-[10px] font-semibold text-cyan-100">{events.length} published</span>
            </div>
            {events.length ? <div className="space-y-2.5">{events.map((event, index) => <Link key={event.id} href="/news-trading" className="group block rounded-xl border border-white/[.07] bg-[#091626]/75 p-3.5 transition hover:border-cyan-200/25 hover:bg-cyan-200/[.035] sm:p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-200/10 bg-cyan-200/[.06] text-[10px] font-bold text-cyan-100">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-100 transition group-hover:text-cyan-100">{event.title}</h4>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${event.trade_bias === "bullish" ? "bg-emerald-300/10 text-emerald-200" : event.trade_bias === "bearish" ? "bg-rose-300/10 text-rose-200" : "bg-slate-300/10 text-slate-300"}`}>{event.trade_bias || "neutral"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {event.event_type && <span className="rounded-md border border-white/[.06] bg-white/[.035] px-2 py-1 text-[9px] capitalize text-slate-400">{event.event_type.replaceAll("_", " ")}</span>}
                    {event.phase && <span className="rounded-md border border-white/[.06] bg-white/[.035] px-2 py-1 text-[9px] capitalize text-slate-400">{event.phase.replaceAll("_", " ")}</span>}
                    {event.market_focus && <span className="rounded-md border border-white/[.06] bg-white/[.035] px-2 py-1 text-[9px] text-slate-400">{event.market_focus}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.06] pt-2.5">
                    <span className="text-[10px] text-slate-500">{event.release_at ? `Scheduled · ${new Date(event.release_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })} WAT` : "Release time not specified"}</span>
                    <span className="text-[10px] font-semibold text-cyan-200 opacity-80 transition group-hover:opacity-100">View scenario ↗</span>
                  </div>
                </div>
              </div>
            </Link>)}</div> : <EmptyState>No published event outlooks are available to your account yet.</EmptyState>}
            <Link href="/macro-radar" className="mt-4 inline-flex rounded-lg border border-cyan-200/15 bg-cyan-200/[.05] px-3 py-2 text-[10px] font-semibold text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-200/[.09]">Open Macro Event Radar ↗</Link>
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-blue-200/10 bg-[linear-gradient(145deg,#14243b,#0b192a)] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-blue-200/70">Analyst research</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-100">Latest publications</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Macro notes, rates analysis and cross-market perspectives.</p>
              </div>
              <span className="rounded-full border border-blue-200/15 bg-blue-200/[.06] px-3 py-1.5 text-[10px] font-semibold text-blue-100">{research.length} available</span>
            </div>
            {research.length ? <div className="space-y-2.5">{research.map((article, index) => <Link key={article.id} href="/analysis" className="group block rounded-xl border border-white/[.07] bg-[#091626]/75 p-3.5 transition hover:border-blue-200/25 hover:bg-blue-200/[.035] sm:p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200/10 bg-blue-200/[.06] text-[10px] font-bold text-blue-100">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-100 transition group-hover:text-blue-100">{article.title}</h4>
                    {article.is_premium_only && <span className="shrink-0 rounded-md border border-amber-200/15 bg-amber-300/[.07] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200">Premium</span>}
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{article.excerpt || article.category.replaceAll("_", " ")}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.06] pt-2.5">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-200/75">{article.category.replaceAll("_", " ")}</span>
                    <span className="text-[10px] text-slate-500">{article.published_at ? new Date(article.published_at).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "Publication date unavailable"}</span>
                  </div>
                </div>
              </div>
            </Link>)}</div> : <EmptyState>No research articles are published for your access level yet.</EmptyState>}
            <Link href="/analysis" className="mt-4 inline-flex rounded-lg border border-blue-200/15 bg-blue-200/[.05] px-3 py-2 text-[10px] font-semibold text-blue-100 transition hover:border-blue-200/30 hover:bg-blue-200/[.09]">Open Research Library ↗</Link>
          </div>
        </div>
      </section>

      <section className="mt-9">
        <PanelHeading eyebrow="Analyst calls" title="Recent public trade ideas" href="/setups" linkText="Browse all ideas" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {publicCalls.length ? publicCalls.map(call => <Link key={call.id} href="/setups" className="group rounded-2xl border border-white/10 bg-[#101e30] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 hover:bg-[#12243a]"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{call.market.replaceAll("_", " ")}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${call.direction === "long" ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{call.direction}</span></div><h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-50">{call.instrument}</h3><p className="mt-2 line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-slate-400">{call.thesis || "Open the trade idea to review the analyst thesis and levels."}</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/[.05] bg-black/15 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-600">Entry</p><p className="mt-1 text-xs font-semibold text-slate-200">{call.entry_price ?? "Not specified"}</p></div><div className="rounded-lg border border-white/[.05] bg-black/15 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-600">Stop loss</p><p className="mt-1 text-xs font-semibold text-slate-200">{call.stop_loss ?? "Not specified"}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-white/[.07] pt-3 text-[10px]"><span className="capitalize text-slate-500">{call.status.replaceAll("_", " ")}</span><span className="font-semibold text-cyan-200 transition group-hover:text-cyan-100">Review call ↗</span></div></Link>) : <div className="sm:col-span-2 xl:col-span-4"><EmptyState>No public trade ideas are currently published.</EmptyState></div>}
        </div>
      </section>

      <section id="journal" className="mt-9">
        <PanelHeading eyebrow="Personal trading journal" title="Recent journal activity" href="/journal/new" linkText="＋ Add trade" />
        {tradeResult.error ? <EmptyState>Your journal could not be loaded. Please refresh and try again.</EmptyState> : trades.length ? <div className="grid gap-3 xl:grid-cols-2">{trades.slice(0, 6).map(trade => {
          const screenshot = imageByTrade.get(trade.id);
          return <article key={trade.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#101e30] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{trade.instrument}</h3><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{(trade.market || "").replaceAll("_", " ")} · {trade.direction}</p>{trade.news_trade_attribution === "direct_news" && <p className="mt-2 text-[10px] text-cyan-200">News trade · {trade.news_event_type || "Event"}{trade.news_event_name ? " · " + trade.news_event_name : ""}</p>}</div><div className="flex items-center gap-2"><span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[10px] text-slate-300">{(trade.status || "").replaceAll("_", " ")}</span><Link href={"/journal/" + trade.id} className="text-xs font-medium text-cyan-200">Open ↗</Link><RecordDeleteButton kind="journal" id={trade.id} /></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-black/20 p-2.5"><p className="text-[10px] text-slate-500">Entry</p><p className="mt-1 text-xs font-medium">{trade.entry_price ?? "—"}</p></div><div className="rounded-lg bg-black/20 p-2.5"><p className="text-[10px] text-slate-500">Stop loss</p><p className="mt-1 text-xs font-medium">{trade.stop_loss ?? "—"}</p></div><div className="rounded-lg bg-black/20 p-2.5"><p className="text-[10px] text-slate-500">Realized R</p><p className={`mt-1 text-xs font-medium ${Number(trade.realized_r) > 0 ? "text-emerald-200" : Number(trade.realized_r) < 0 ? "text-rose-200" : "text-slate-200"}`}>{trade.realized_r === null ? "—" : `${Number(trade.realized_r) > 0 ? "+" : ""}${Number(trade.realized_r).toFixed(2)}R`}</p></div></div>
            {screenshot && <img src={screenshot} alt={trade.instrument + " trade chart"} className="mt-3 max-h-64 w-full rounded-xl border border-white/10 object-contain" />}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Trade thesis", trade.thesis], ["Fundamental", trade.fundamental_analysis], ["Intermarket", trade.intermarket_analysis]].map(([label, value]) => <div key={String(label)}><h4 className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200/80">{label}</h4><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-400">{value || "No notes recorded."}</p></div>)}</div>
            <p className="mt-3 border-t border-white/[.07] pt-3 text-[10px] text-slate-600">{new Date(trade.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
          </article>;
        })}</div> : <EmptyState>Your private journal is empty. Record your first trade to start building your performance history.</EmptyState>}
      </section>

      <footer className="mt-8 border-t border-white/[.07] py-5 text-center text-[10px] text-slate-600">AIS TERMINAL · INTERMARKET STRATEGIST · Journal metrics reflect records entered in your account.</footer>
      </div>
    </div>
  </main>;
}
