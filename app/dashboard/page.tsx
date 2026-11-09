import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PremiumBadge from "@/components/premium-badge";
import NotificationBell from "@/components/notification-bell";
import RecordDeleteButton from "@/components/record-delete-button";

function Metric({ label, value, detail, accent = "cyan" }: { label: string; value: string; detail: string; accent?: "cyan" | "blue" | "green" | "amber" }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[.06] text-cyan-200",
    blue: "border-blue-300/15 bg-blue-300/[.06] text-blue-200",
    green: "border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200",
    amber: "border-amber-300/15 bg-amber-300/[.06] text-amber-200",
  };
  return <div className={`rounded-2xl border p-4 ${tones[accent]}`}>
    <p className="text-[10px] font-semibold uppercase tracking-[.16em] opacity-70">{label}</p>
    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
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

  const [tradeResult, publicTradeResult, eventResult, researchResult] = await Promise.all([
    supabase.from("private_trades").select("id,instrument,market,direction,status,created_at,entry_price,stop_loss,thesis,fundamental_analysis,intermarket_analysis,news_trade_attribution,news_event_type,news_event_name,realized_r").order("created_at", { ascending: false }).limit(30),
    supabase.from("public_trades").select("id,slug,instrument,market,direction,status,entry_price,stop_loss,thesis,published_at,created_at").eq("content_state", "published").order("published_at", { ascending: false }).limit(4),
    supabase.from("news_setups").select("id,title,event_type,event_name,release_at,phase,trade_bias,access_level,research_category,published_at").eq("publication_status", "published").in("access_level", hasPremium ? ["free", "premium"] : ["free"]).order("published_at", { ascending: false }).limit(4),
    (() => {
      let query = supabase.from("analysis_articles").select("id,slug,title,excerpt,category,is_premium_only,published_at").eq("content_state", "published");
      if (!hasPremium) query = query.eq("is_premium_only", false);
      return query.order("published_at", { ascending: false }).limit(3);
    })(),
  ]);

  const trades = tradeResult.data ?? [];
  const closedTrades = trades.filter(t => t.status !== "in_progress" && t.status !== "cancelled" && t.realized_r !== null);
  const wins = closedTrades.filter(t => Number(t.realized_r) > 0).length;
  const netR = closedTrades.reduce((sum, t) => sum + Number(t.realized_r || 0), 0);
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : null;
  const activeTrades = trades.filter(t => t.status === "in_progress").length;
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

  return <main className="min-h-screen bg-[#081321] px-3 py-4 text-slate-100 sm:px-5 sm:py-6 lg:px-8">
    <div className="mx-auto max-w-[1440px]">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#101e30] px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <Link href="/" className="text-[10px] font-bold tracking-[.22em] text-cyan-200">INTERMARKET STRATEGIST</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AIS Terminal</h1>{hasPremium && <PremiumBadge />}</div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">Good to see you, {displayName}. Your research and trading workspace.</p>
        </div>
        <div className="flex items-center gap-2"><NotificationBell /><Link href="/settings" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Settings</Link><form action="/auth/signout" method="post"><button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Sign out</button></form></div>
      </header>

      <nav aria-label="Terminal sections" className="mt-3 flex gap-2 overflow-x-auto rounded-xl border border-white/[.08] bg-[#0d1a2b] p-2 text-xs whitespace-nowrap">
        {[["Overview","#overview"],["Live sessions","/sessions#live-sessions"],["Video library","/sessions#session-library"],["News & Macro","/news-trading"],["Trade ideas","/setups"],["Research","/analysis"],["Community","/lounge"],["Private messages","/messages"],["My journal","#journal"]].map(([label,href]) => <Link key={label} href={href} className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-cyan-200/10 hover:text-cyan-100">{label}</Link>)}
      </nav>

      <section id="overview" className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Journal records" value={String(trades.length)} detail="Your private trade history" accent="cyan" />
        <Metric label="Active positions" value={String(activeTrades)} detail="Trades marked in progress" accent="blue" />
        <Metric label="Journal win rate" value={winRate === null ? "—" : `${winRate}%`} detail={closedTrades.length ? `Based on ${closedTrades.length} closed records with R results` : "Add closed-trade results to calculate"} accent="green" />
        <Metric label="Net realized R" value={closedTrades.length ? `${netR > 0 ? "+" : ""}${netR.toFixed(2)}R` : "—"} detail="Sum of recorded realized R" accent="amber" />
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-200/15 bg-gradient-to-br from-[#12304a] via-[#10243a] to-[#101c2d] p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-cyan-200/10" /><div className="pointer-events-none absolute -right-2 -top-6 h-36 w-36 rounded-full border border-cyan-200/10" />
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200/75">Analyst workspace</p>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">Connect the macro picture to the market structure.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Review published event scenarios, follow official trade ideas, and keep your own execution record in one place.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Link href="/news-trading" className="rounded-lg bg-cyan-200 px-4 py-2.5 text-xs font-semibold text-[#082033] hover:bg-cyan-100">Open Macro Desk ↗</Link><Link href="/journal/new" className="rounded-lg border border-white/15 bg-white/[.04] px-4 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/[.08]">＋ Record a trade</Link></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#101e30] p-5">
          <PanelHeading eyebrow="Account status" title="Membership & access" />
          <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-[#0b1728] p-4"><div><p className="text-sm font-semibold">{hasPremium ? "Premium access enabled" : "Standard account"}</p><p className="mt-1 text-xs text-slate-500">{hasPremium ? "Premium research and member areas are unlocked." : "Free research is available on your account."}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${hasPremium ? "bg-emerald-300/10 text-emerald-200" : "bg-slate-500/15 text-slate-300"}`}>{hasPremium ? "ACTIVE" : "FREE"}</span></div>
          {!hasPremium && <Link href="/pricing" className="mt-3 block rounded-lg border border-amber-200/15 bg-amber-200/[.05] px-4 py-3 text-xs font-medium text-amber-100 hover:bg-amber-200/[.08]">Explore Premium membership and unlock the full research desk ↗</Link>}
          <div className="mt-4 grid grid-cols-2 gap-2"><Link href="/profile" className="rounded-lg border border-white/[.07] p-3 text-xs text-slate-300 hover:border-cyan-200/20">Public profile ↗</Link><Link href="/notifications" className="rounded-lg border border-white/[.07] p-3 text-xs text-slate-300 hover:border-cyan-200/20">Notifications ↗</Link></div>
        </div>
      </section>

      <section className="mt-7">
        <PanelHeading eyebrow="Market intelligence" title="Research & event watch" href="/news-trading" linkText="Open Macro Desk" />
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#101e30] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Latest event scenarios</h3><span className="text-[10px] uppercase tracking-wider text-slate-500">Published outlooks</span></div>
            {events.length ? <div className="divide-y divide-white/[.07]">{events.map(event => <Link key={event.id} href="/news-trading" className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1 hover:bg-white/[.02]"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{event.title}</p><p className="mt-1 text-[11px] text-slate-500">{event.event_type.replaceAll("_", " ")} · {event.phase.replaceAll("_", " ")}</p>{event.release_at && <p className="mt-1 text-[11px] text-slate-400">{new Date(event.release_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>}</div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${event.trade_bias === "bullish" ? "bg-emerald-300/10 text-emerald-200" : event.trade_bias === "bearish" ? "bg-rose-300/10 text-rose-200" : "bg-slate-300/10 text-slate-300"}`}>{event.trade_bias}</span></Link>)}</div> : <EmptyState>No published event outlooks are available to your account yet.</EmptyState>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101e30] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Latest research notes</h3><span className="text-[10px] uppercase tracking-wider text-slate-500">Analyst publications</span></div>
            {research.length ? <div className="divide-y divide-white/[.07]">{research.map(article => <Link key={article.id} href="/analysis" className="block py-3 first:pt-1 last:pb-1 hover:bg-white/[.02]"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium text-slate-100">{article.title}</p>{article.is_premium_only && <span className="shrink-0 text-[9px] font-semibold text-amber-200">PREMIUM</span>}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{article.excerpt || article.category.replaceAll("_", " ")}</p></Link>)}</div> : <EmptyState>No research articles are published for your access level yet.</EmptyState>}
          </div>
        </div>
      </section>

      <section className="mt-7">
        <PanelHeading eyebrow="Analyst calls" title="Recent public trade ideas" href="/setups" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {publicCalls.length ? publicCalls.map(call => <Link key={call.id} href="/setups" className="rounded-2xl border border-white/10 bg-[#101e30] p-4 transition hover:border-cyan-200/25"><div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-wider text-slate-500">{call.market.replaceAll("_", " ")}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${call.direction === "long" ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{call.direction}</span></div><h3 className="mt-3 text-lg font-semibold">{call.instrument}</h3><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{call.thesis || "Open the trade idea to review the analyst thesis and levels."}</p><div className="mt-3 flex items-center justify-between border-t border-white/[.07] pt-3 text-[10px] text-slate-400"><span>{call.status.replaceAll("_", " ")}</span><span>View idea ↗</span></div></Link>) : <div className="sm:col-span-2 xl:col-span-4"><EmptyState>No public trade ideas are currently published.</EmptyState></div>}
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
  </main>;
}
