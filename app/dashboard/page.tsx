import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PremiumBadge from "@/components/premium-badge";
import NotificationBell from "@/components/notification-bell";
import RecordDeleteButton from "@/components/record-delete-button";
import TerminalMobileNav from "./terminal-mobile-nav";

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

  const [tradeResult, journalAnalyticsResult, publicTradeResult, eventResult, researchResult] = await Promise.all([
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
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : null;
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

  return <main className="relative min-h-screen overflow-hidden bg-[#07111f] px-3 py-4 text-slate-100 sm:px-5 sm:py-6 lg:px-8">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(34,211,238,.09),transparent_34%),radial-gradient(ellipse_at_90%_18%,rgba(59,130,246,.07),transparent_30%)]" />
    <div className="relative z-10 mx-auto max-w-[1480px]">
      <header className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[26px] border border-cyan-100/[.13] bg-[linear-gradient(112deg,#102b42_0%,#102237_48%,#0c192a_100%)] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border border-cyan-100/[.07] shadow-[0_0_0_28px_rgba(255,255,255,.012),0_0_0_58px_rgba(255,255,255,.01)]" />
        <div className="min-w-0">
          <Link href="/" className="text-[10px] font-bold tracking-[.22em] text-cyan-200">INTERMARKET STRATEGIST</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AIS Terminal</h1>{hasPremium && <PremiumBadge />}</div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">Good to see you, {displayName}. Your research and trading workspace.</p>
        </div>
        <div className="flex items-center gap-2"><NotificationBell /><Link href="/settings" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Settings</Link><form action="/auth/signout" method="post"><button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Sign out</button></form></div>
      </header>

      <TerminalMobileNav />

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-[22px] border border-white/[.09] bg-[#0a1727]/95 p-3.5 shadow-[0_22px_55px_rgba(0,0,0,.28)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 px-3 pb-3 pt-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-200/[.08] text-[10px] font-black text-cyan-100">AIS</span><div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-300">Terminal workspace</p><p className="mt-0.5 text-[9px] text-slate-600">Research · Execution · Review</p></div></div>
            <div className="space-y-1">
              {[["⌂","Overview","#overview"],["◷","Live sessions","/sessions#live-sessions"],["▶","Video library","/sessions#session-library"],["◈","News & Macro","/news-trading"],["◷","Macro Event Radar","/macro-radar"],["↗","Trade ideas","/setups"],["▤","Research library","/analysis"],["▥","COT reports","/cot-reports"],["◎","Community room","/lounge"],["✉","Private messages","/messages"],["▣","My journal","#journal"]].map(([icon,label,href], index) => <Link key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${index === 0 ? "border border-cyan-200/15 bg-cyan-200/[.08] text-cyan-100" : "text-slate-400 hover:bg-white/[.04] hover:text-slate-100"}`}><span className="w-4 text-center text-sm">{icon}</span>{label}</Link>)}
            </div>
            <div className="mt-5 rounded-xl border border-cyan-200/10 bg-cyan-200/[.04] p-3">
              <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-cyan-200/70">Analyst principle</p>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">Macro context. Intermarket confirmation. Disciplined execution.</p>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
      <section id="overview" aria-label="Dashboard overview" className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative overflow-hidden rounded-[26px] border border-cyan-200/20 bg-[radial-gradient(ellipse_at_95%_0%,rgba(34,211,238,.15),transparent_35%),linear-gradient(125deg,#12334c_0%,#10263d_48%,#101b2d_100%)] p-6 shadow-[0_24px_65px_rgba(0,0,0,.25)] sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-cyan-200/10" /><div className="pointer-events-none absolute -right-2 -top-6 h-36 w-36 rounded-full border border-cyan-200/10" />
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200/75">Analyst workspace</p>
          <h2 className="mt-3 max-w-xl text-[clamp(1.65rem,3vw,2.35rem)] font-semibold leading-[1.12] tracking-tight sm:mt-4">Connect the macro picture to the market structure.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Review published event scenarios, follow official trade ideas, and keep your own execution record in one place.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Link href="/news-trading" className="rounded-lg bg-cyan-200 px-4 py-2.5 text-xs font-bold text-[#082033] shadow-[0_6px_20px_rgba(34,211,238,.16)] transition hover:-translate-y-0.5 hover:bg-cyan-100">Open Macro Desk ↗</Link><Link href="/journal/new" className="rounded-lg border border-white/15 bg-white/[.05] px-4 py-2.5 text-xs font-semibold text-slate-100 transition hover:border-cyan-100/25 hover:bg-white/[.09]">＋ Record a trade</Link></div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[.09] pt-4 text-[9px] font-semibold uppercase tracking-[.15em] text-slate-400"><span><span className="mr-1.5 text-cyan-200">01</span> Macro context</span><span><span className="mr-1.5 text-cyan-200">02</span> Intermarket confirmation</span><span><span className="mr-1.5 text-cyan-200">03</span> Disciplined execution</span></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#101e30] p-5">
          <PanelHeading eyebrow="Account status" title="Membership & access" />
          <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-[#0b1728] p-4"><div><p className="text-sm font-semibold">{hasPremium ? "Premium access enabled" : "Standard account"}</p><p className="mt-1 text-xs text-slate-500">{hasPremium ? "Premium research and member areas are unlocked." : "Free research is available on your account."}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${hasPremium ? "bg-emerald-300/10 text-emerald-200" : "bg-slate-500/15 text-slate-300"}`}>{hasPremium ? "ACTIVE" : "FREE"}</span></div>
          {!hasPremium && <Link href="/pricing" className="mt-3 block rounded-lg border border-amber-200/15 bg-amber-200/[.05] px-4 py-3 text-xs font-medium text-amber-100 hover:bg-amber-200/[.08]">Explore Premium membership and unlock the full research desk ↗</Link>}
          <div className="mt-4 grid grid-cols-2 gap-2"><Link href="/profile" className="rounded-lg border border-white/[.07] p-3 text-xs text-slate-300 hover:border-cyan-200/20">Public profile ↗</Link><Link href="/notifications" className="rounded-lg border border-white/[.07] p-3 text-xs text-slate-300 hover:border-cyan-200/20">Notifications ↗</Link></div>
        </div>
      </section>


      <section aria-label="Recent trading performance" className="mt-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200/70">Performance snapshot</p><h2 className="mt-1 text-base font-semibold text-slate-100">Your recent activity</h2></div><p className="text-[10px] text-slate-500">Based on your latest 30 journal records</p></div>
        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Metric label="Recent records" value={String(trades.length)} detail="Latest records in your private journal" accent="cyan" />
        <Metric label="Active in recent records" value={String(activeTrades)} detail="Marked in progress in this recent sample" accent="blue" />
        <Metric label="Recent win rate" value={winRate === null ? "—" : `${winRate}%`} detail={closedTrades.length ? `From ${closedTrades.length} recent closed records with R results` : "Add closed-trade results to calculate"} accent="green" />
        <Metric label="Net realized R" value={closedTrades.length ? `${netR > 0 ? "+" : ""}${netR.toFixed(2)}R` : "—"} detail="Combined realized R in this recent sample" accent="amber" />
        </div>
      </section>

      <section aria-label="Journal performance analytics" className="mt-6 rounded-[22px] border border-cyan-200/10 bg-[#0d1b2c] p-4 shadow-[0_18px_45px_rgba(0,0,0,.18)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200/70">Journal analytics</p><h2 className="mt-1 text-lg font-semibold text-slate-100">Execution performance</h2><p className="mt-1 text-[11px] text-slate-500">Latest {analyticsTrades.length.toLocaleString("en-NG")} records · {Number(journalAnalyticsResult.count ?? analyticsTrades.length).toLocaleString("en-NG")} total journal records</p></div>
          <Link href="/barometer" className="text-xs font-semibold text-cyan-200 hover:text-cyan-100">Detailed news-trade analytics ↗</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="Closed trades" value={String(closedTrades.length)} detail={wins + " wins · " + losses + " losses · " + breakevenTrades + " breakeven"} accent="blue" />
          <Metric label="Win rate" value={winRate === null ? "—" : String(winRate) + "%"} detail="Breakeven trades excluded" accent="green" />
          <Metric label="Profit factor" value={profitFactor === null ? "—" : Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"} detail="Gross profit R ÷ gross loss R" accent="cyan" />
          <Metric label="Average result" value={closedTrades.length ? ((netR / closedTrades.length) > 0 ? "+" : "") + (netR / closedTrades.length).toFixed(2) + "R" : "—"} detail="Average realized R per closed trade" accent="amber" />
        </div>
        <div className="mt-4 rounded-xl border border-white/[.06] bg-[#091525] p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-slate-200">Performance by market</h3><span className="text-[9px] text-slate-600">Latest 1,000 records at most</span></div>
          {marketPerformance.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{marketPerformance.map(item => <div key={item.market} className="rounded-lg border border-white/[.06] bg-white/[.02] p-3"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.market.replaceAll("_", " ")}</p><div className="mt-2 flex items-end justify-between gap-2"><span className="text-xs text-slate-500">{item.count} closed</span><span className={`text-sm font-semibold tabular-nums ${item.net > 0 ? "text-emerald-200" : item.net < 0 ? "text-rose-200" : "text-slate-200"}`}>{item.net > 0 ? "+" : ""}{item.net.toFixed(2)}R</span></div><p className="mt-1 text-[10px] text-slate-500">Win rate · {item.winRate === null ? "—" : item.winRate + "%"}</p></div>)}</div> : <p className="text-xs text-slate-500">Close and record trades with a realized R result to populate market performance.</p>}
        </div>
        <p className="mt-3 text-[10px] leading-5 text-slate-600">Performance calculations use completed records with a realized R value. Win rate excludes breakeven; open, cancelled and unscored trades are excluded. The detailed news-trading Barometer uses only trades classified as direct news trades.</p>
      </section>

      <section className="mt-8">
        <PanelHeading eyebrow="Market intelligence" title="Research & event watch" href="/news-trading" linkText="Open Macro Desk" />
        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-white/10 bg-[#101e30] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Event scenarios</h3><p className="mt-1 text-[11px] text-slate-500">Published macro outlooks and market bias</p></div><span className="rounded-full border border-cyan-200/10 bg-cyan-200/[.05] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-100">{events.length} available</span></div>
            {events.length ? <div className="space-y-2">{events.map(event => <Link key={event.id} href="/news-trading" className="block rounded-xl border border-white/[.07] bg-[#0b1728] p-3.5 transition hover:border-cyan-200/20 hover:bg-cyan-200/[.025]"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-100">{event.title}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-md bg-white/[.05] px-2 py-1 text-[9px] capitalize text-slate-400">{event.event_type.replaceAll("_", " ")}</span><span className="rounded-md bg-white/[.05] px-2 py-1 text-[9px] capitalize text-slate-400">{event.phase.replaceAll("_", " ")}</span>{event.market_focus && <span className="rounded-md bg-white/[.05] px-2 py-1 text-[9px] text-slate-400">{event.market_focus}</span>}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${event.trade_bias === "bullish" ? "bg-emerald-300/10 text-emerald-200" : event.trade_bias === "bearish" ? "bg-rose-300/10 text-rose-200" : "bg-slate-300/10 text-slate-300"}`}>{event.trade_bias}</span></div>{event.release_at && <p className="mt-3 border-t border-white/[.06] pt-2 text-[10px] text-slate-500">Event time · {new Date(event.release_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })} WAT</p>}</Link>)}</div> : <EmptyState>No published event outlooks are available to your account yet.</EmptyState>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101e30] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Research publications</h3><p className="mt-1 text-[11px] text-slate-500">Latest analyst notes and market studies</p></div><span className="rounded-full border border-white/[.07] bg-white/[.03] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{research.length} available</span></div>
            {research.length ? <div className="space-y-2">{research.map(article => <Link key={article.id} href="/analysis" className="block rounded-xl border border-white/[.07] bg-[#0b1728] p-3.5 transition hover:border-cyan-200/20 hover:bg-cyan-200/[.025]"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold leading-5 text-slate-100">{article.title}</p>{article.is_premium_only && <span className="shrink-0 rounded bg-amber-300/10 px-2 py-1 text-[9px] font-semibold text-amber-200">PREMIUM</span>}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{article.excerpt || article.category.replaceAll("_", " ")}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.06] pt-2"><span className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200/70">{article.category.replaceAll("_", " ")}</span>{article.published_at && <span className="text-[10px] text-slate-600">{new Date(article.published_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>}</div></Link>)}</div> : <EmptyState>No research articles are published for your access level yet.</EmptyState>}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <PanelHeading eyebrow="Analyst calls" title="Recent public trade ideas" href="/setups" linkText="Browse all ideas" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {publicCalls.length ? publicCalls.map(call => <Link key={call.id} href="/setups" className="group rounded-2xl border border-white/10 bg-[#101e30] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 hover:bg-[#12243a]"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{call.market.replaceAll("_", " ")}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${call.direction === "long" ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{call.direction}</span></div><h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-50">{call.instrument}</h3><p className="mt-2 line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-slate-400">{call.thesis || "Open the trade idea to review the analyst thesis and levels."}</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/[.05] bg-black/15 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-600">Entry</p><p className="mt-1 text-xs font-semibold text-slate-200">{call.entry_price ?? "Not specified"}</p></div><div className="rounded-lg border border-white/[.05] bg-black/15 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-600">Stop loss</p><p className="mt-1 text-xs font-semibold text-slate-200">{call.stop_loss ?? "Not specified"}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-white/[.07] pt-3 text-[10px]"><span className="capitalize text-slate-500">{call.status.replaceAll("_", " ")}</span><span className="font-semibold text-cyan-200 transition group-hover:text-cyan-100">Review call ↗</span></div></Link>) : <div className="sm:col-span-2 xl:col-span-4"><EmptyState>No public trade ideas are currently published.</EmptyState></div>}
        </div>
      </section>

      <section className="mt-7">
        <PanelHeading eyebrow="Terminal navigation" title="Trading & research tools" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <QuickLink href="/journal/new" icon="＋" title="Record a trade" description="Log your entry, thesis, risk and execution." />
          <QuickLink href="/barometer" icon="◉" title="News Trading Barometer" description="Review your news-trading win rate, profit factor and realized R." />
          <QuickLink href="/setups" icon="↗" title="Public trade ideas" description="Follow official analyst calls and trade updates." />
          <QuickLink href="/analysis" icon="▥" title="Research library" description="Browse published macro and intermarket analysis." />
          <QuickLink href="/news-trading" icon="◈" title="News & Macro Desk" description="Review economic-event scenarios and macro outlooks." />
          <QuickLink href="/macro-radar" icon="◷" title="Macro Event Radar" description="Track upcoming releases, impact levels and actual-versus-consensus data." />
          <QuickLink href={hasPremium ? "/lounge" : "/pricing"} icon="☏" title="Community room" description={hasPremium ? "Join the shared Premium analyst–member discussion." : "Unlock the private member community."} locked={!hasPremium} />
          <QuickLink href={hasPremium ? "/messages" : "/pricing"} icon="✉" title="Private messages" description={hasPremium ? "Open your dedicated private inbox and message members directly." : "Unlock private member messaging."} locked={!hasPremium} />
          <QuickLink href={hasPremium || isAdmin ? "/sessions#live-sessions" : "/pricing"} icon="●" title="Live sessions" description="See upcoming briefings and join live analyst rooms." locked={!hasPremium && !isAdmin} />
          <QuickLink href={hasPremium || isAdmin ? "/sessions#session-library" : "/pricing"} icon="▶" title="Video library" description="Revisit recorded briefings and market breakdowns." locked={!hasPremium && !isAdmin} />
          <QuickLink href="/pricing" icon="✦" title="Membership plans" description="Review membership options and access." />
          {isAdmin && <QuickLink href="/admin" icon="▣" title="Admin workspace" description="Publish trade calls, research and platform updates." />}
        </div>
      </section>

      <section id="journal" className="mt-8">
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
    </div>
  </main>;
}
