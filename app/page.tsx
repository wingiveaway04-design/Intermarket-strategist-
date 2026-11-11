import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function dateLabel(value: string | null) {
  if (!value) return "Recently published";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function pretty(value: string | null) {
  return (value || "market").replaceAll("_", " ").replace(/\\b\\w/g, (char) => char.toUpperCase());
}

function statusStyle(status: string | null) {
  if (status === "all_targets_hit") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  if (status === "stopped_out") return "border-rose-300/20 bg-rose-300/10 text-rose-200";
  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-200";
}

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: articles }, { data: trades }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("analysis_articles")
      .select("id,slug,title,excerpt,category,published_at,is_premium_only")
      .eq("content_state", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    supabase.from("public_trades")
      .select("id,slug,instrument,market,direction,status,published_at,thesis")
      .eq("content_state", "published")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);
  const profile = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = profile.data?.role === "admin";
  const latestArticle = articles?.[0] ?? null;
  const latestTrade = trades?.[0] ?? null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/[.08] bg-[#07111f]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.08] text-xs font-black tracking-tight text-cyan-200">AIS</span>
            <span><span className="block text-[11px] font-bold tracking-[.18em] text-white">INTERMARKET <span className="text-cyan-300">STRATEGIST</span></span><span className="mt-0.5 block text-[9px] tracking-[.2em] text-slate-500">INDEPENDENT MARKET RESEARCH</span></span>
          </Link>
          <nav className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            <Link href="/analysis" className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-cyan-200 sm:inline-flex">Research</Link>
            <Link href="/setups" className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-cyan-200 sm:inline-flex">Trade ideas</Link>
            {isAdmin && <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-violet-200 hover:bg-violet-300/10 sm:inline-flex">Admin</Link>}
            <Link href={user ? "/dashboard" : "/login"} className="rounded-lg border border-white/10 px-3 py-2 text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-100">{user ? "AIS Terminal" : "Sign in"}</Link>
            {!user && <Link href="/register" className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300">Create account</Link>}
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-white/[.06]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_16%,rgba(34,211,238,.15),transparent_34%),radial-gradient(ellipse_at_10%_90%,rgba(99,102,241,.13),transparent_36%),linear-gradient(120deg,#0b1c2d,#07111f_60%,#0a1425)]" />
        <div className="pointer-events-none absolute right-[8%] top-16 -z-10 h-64 w-64 rounded-full border border-cyan-200/[.08] sm:h-96 sm:w-96" />
        <div className="pointer-events-none absolute right-[13%] top-24 -z-10 h-52 w-52 rounded-full border border-cyan-200/[.07] sm:h-80 sm:w-80" />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Macro · Fundamental · Intermarket</p>
            <h1 className="mt-6 max-w-3xl text-[2.55rem] font-semibold leading-[1.08] tracking-[-.045em] text-white sm:text-5xl lg:text-[3.8rem]">See the forces behind the move. <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300 bg-clip-text text-transparent">Think beyond the chart.</span></h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">Independent market research connecting economic data, central-bank policy, positioning and cross-asset relationships — translated into clear market scenarios and disciplined trade ideas.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/analysis" className="rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300">Explore latest research <span aria-hidden="true">↗</span></Link>
              <Link href="/setups" className="rounded-xl border border-white/15 bg-white/[.04] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/[.07]">View trade ideas</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/[.08] pt-5 text-[11px] text-slate-400">
              <span><span className="mr-2 text-cyan-300">01</span>Macro context</span>
              <span><span className="mr-2 text-cyan-300">02</span>Cross-market analysis</span>
              <span><span className="mr-2 text-cyan-300">03</span>Transparent trade tracking</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-cyan-400/[.05] blur-2xl" />
            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1b2c]/90 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-white/[.08] px-5 py-4">
                <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">The analyst's view</p><p className="mt-1 text-xs text-slate-500">Latest published perspective</p></div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-200">Research desk</span>
              </div>
              {latestArticle ? <Link href={"/analysis/" + latestArticle.slug} className="group block p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500"><span className="uppercase tracking-[.16em] text-violet-200">{pretty(latestArticle.category)}</span><span>{dateLabel(latestArticle.published_at)}</span></div>
                <h2 className="mt-4 text-xl font-semibold leading-snug text-white transition group-hover:text-cyan-100 sm:text-2xl">{latestArticle.title}</h2>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-400">{latestArticle.excerpt || "Open the research desk to read the latest published analysis."}</p>
                <div className="mt-6 flex items-center justify-between border-t border-white/[.08] pt-4"><span className="text-[10px] text-slate-500">{latestArticle.is_premium_only ? "Premium publication · Preview" : "Published research"}</span><span className="text-xs font-semibold text-cyan-300">Read analysis ↗</span></div>
              </Link> : <div className="p-6"><h2 className="text-lg font-semibold text-white">Research perspectives are coming soon</h2><p className="mt-2 text-sm leading-6 text-slate-400">New analyst publications will appear here once they are published.</p><Link href="/analysis" className="mt-4 inline-flex text-xs font-semibold text-cyan-300">Visit the research library ↗</Link></div>}
              <div className="grid grid-cols-2 border-t border-white/[.08] bg-black/10">
                <div className="p-4"><p className="text-[9px] uppercase tracking-[.16em] text-slate-500">Latest trade idea</p><p className="mt-2 text-sm font-semibold text-white">{latestTrade?.instrument || "Trade desk"}</p><p className="mt-1 text-[10px] text-slate-500">{latestTrade ? pretty(latestTrade.market) + " · " + pretty(latestTrade.direction) : "Published calls only"}</p></div>
                <div className="border-l border-white/[.08] p-4"><p className="text-[9px] uppercase tracking-[.16em] text-slate-500">Publication model</p><p className="mt-2 text-sm font-semibold text-white">Evidence-led</p><p className="mt-1 text-[10px] text-slate-500">No fabricated market data</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">From the research desk</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Latest market intelligence</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Fresh publications and trade plans, presented as they are officially released.</p></div>
          <Link href="/analysis" className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-100">All research ↗</Link>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-violet-200">Research publications</p><span className="text-[10px] text-slate-500">Latest 3</span></div>
            <div className="grid gap-3">
              {articles?.length ? articles.map((article) => <Link key={article.id} href={"/analysis/" + article.slug} className="group rounded-2xl border border-white/[.08] bg-gradient-to-r from-[#102238] to-[#0c1929] p-4 transition hover:border-cyan-300/25 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[.15em] text-cyan-200">{pretty(article.category)}</span><span className="text-[10px] text-slate-500">{dateLabel(article.published_at)}</span></div>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3"><h3 className="max-w-2xl text-base font-semibold leading-snug text-white group-hover:text-cyan-100">{article.title}</h3>{article.is_premium_only && <span className="shrink-0 rounded-full border border-violet-300/20 bg-violet-300/[.07] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-200">Premium</span>}</div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{article.excerpt || "Open this publication for the full research note."}</p>
              </Link>) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-6 text-sm text-slate-400">No research has been published yet. New reports will appear here when released.</div>}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-emerald-200">Official trade ideas</p><Link href="/setups" className="text-[10px] font-semibold text-cyan-300">View all ↗</Link></div>
            <div className="grid gap-3">
              {trades?.length ? trades.map((trade) => <Link key={trade.id} href="/setups" className="rounded-2xl border border-white/[.08] bg-[#0d1b2b] p-4 transition hover:border-emerald-300/20">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-[.14em] text-slate-500">{pretty(trade.market)}</span><span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${statusStyle(trade.status)}`}>{pretty(trade.status)}</span></div>
                <div className="mt-3 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-white">{trade.instrument}</h3><span className={trade.direction === "long" ? "text-xs font-bold tracking-wider text-emerald-200" : "text-xs font-bold tracking-wider text-rose-200"}>{pretty(trade.direction)}</span></div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{trade.thesis || "Open the trade desk to review the published setup and its context."}</p>
                <p className="mt-3 text-[10px] text-slate-500">{dateLabel(trade.published_at)}</p>
              </Link>) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-6 text-sm text-slate-400">No public trade ideas are currently published. Only official administrator-approved calls appear here.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-[#0a1726]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 lg:px-10">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">01 / The framework</p><h3 className="mt-3 text-lg font-semibold text-white">Connect the macro picture</h3><p className="mt-2 text-sm leading-6 text-slate-400">Understand how inflation, growth, monetary policy, yields, currencies and commodities can shape market direction.</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300">02 / The execution</p><h3 className="mt-3 text-lg font-semibold text-white">Translate context into scenarios</h3><p className="mt-2 text-sm leading-6 text-slate-400">Review published trade plans with a stated thesis, direction, risk levels and transparent status updates.</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300">03 / The discipline</p><h3 className="mt-3 text-lg font-semibold text-white">Keep the process accountable</h3><p className="mt-2 text-sm leading-6 text-slate-400">Use the private AIS Terminal and personal journal to organise research, review decisions and track your own process.</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <div className="relative overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,.13),transparent_42%),linear-gradient(110deg,#10243a,#0d1728)] p-6 sm:p-9 lg:p-11">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">Go beyond the headlines</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Build a clearer view of the markets.</h2><p className="mt-3 text-sm leading-7 text-slate-300">Explore the public research desk, follow published trade ideas, or create an account to access your own private workspace.</p></div>
            <div className="flex shrink-0 flex-wrap gap-3"><Link href="/analysis" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[.06]">Explore research</Link><Link href={user ? "/dashboard" : "/register"} className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">{user ? "Open AIS Terminal" : "Create free account"}</Link></div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[.08] bg-[#050d17] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold tracking-[.14em] text-slate-300">INTERMARKET STRATEGIST</span>
          <div className="flex flex-wrap gap-4"><Link href="/analysis" className="hover:text-cyan-200">Research</Link><Link href="/setups" className="hover:text-cyan-200">Trade ideas</Link><Link href="/pricing" className="hover:text-cyan-200">Membership</Link><Link href="/login" className="hover:text-cyan-200">Sign in</Link></div>
          <span>Research and education · Not investment advice</span>
        </div>
      </footer>
    </main>
  );
}
