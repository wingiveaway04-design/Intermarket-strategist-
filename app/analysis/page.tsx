import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const categories = [
  { key: "macro", name: "Macro", note: "Growth, inflation, labour data and central-bank reaction functions.", number: "01" },
  { key: "rates", name: "Rates", note: "Policy expectations, sovereign yields, real rates and curve dynamics.", number: "02" },
  { key: "currencies", name: "Currencies", note: "FX drivers, relative policy, positioning and currency themes.", number: "03" },
  { key: "commodities", name: "Commodities", note: "Energy, metals and fundamental supply-demand analysis.", number: "04" },
  { key: "cross_market", name: "Cross-Market Perspectives", note: "How rates, FX, equities, commodities and risk sentiment interact.", number: "05" },
];

function formatDate(value: string | null) {
  if (!value) return "Research note";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AnalysisPage() {
  const supabase = await createClient();
  const [{ data: articles }, { data: { user } }] = await Promise.all([
    supabase.from("analysis_articles")
      .select("id,slug,title,excerpt,category,published_at,video_url,is_premium_only")
      .eq("content_state", "published")
      .order("published_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  let hasPremium = false;
  if (user) {
    const { data } = await supabase.rpc("has_premium_access", { check_user_id: user.id });
    hasPremium = Boolean(data) || profile?.role === "admin";
  }

  const published = articles || [];
  const premiumCount = published.filter((article) => article.is_premium_only).length;
  const latest = published[0] || null;

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 sm:py-9 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href="/" className="text-xs font-bold tracking-[.2em] text-cyan-300">INTERMARKET STRATEGIST</Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/setups" className="text-slate-400 transition hover:text-cyan-200">Trade ideas</Link>
            {user ? <Link href="/dashboard" className="text-slate-400 transition hover:text-cyan-200">AIS Terminal</Link> : <Link href="/login" className="text-slate-400 transition hover:text-cyan-200">Sign in</Link>}
            {profile?.role === "admin" && <Link href="/admin/research/new" className="rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-violet-200">Publish research</Link>}
          </nav>
        </header>

        <section className="relative mt-7 overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(ellipse_at_top_right,_rgba(34,211,238,0.16),_transparent_48%),linear-gradient(125deg,#10243a,#0b1728_58%,#15152c)] p-6 sm:p-8 lg:p-10">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.7fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Research desk
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Macro · Fundamental · Intermarket</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">Research built around the forces moving markets.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Explore structured analysis across economic data, central-bank policy, currencies, commodities and cross-market relationships. Each publication separates the underlying drivers from the market implications.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#research-topics" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">Explore research topics</a>
                {!user && <Link href="/register" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Create free account</Link>}
                {user && <Link href="/dashboard" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Open AIS Terminal</Link>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs text-slate-400">Published research</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{published.length}</p>
                <p className="mt-1 text-xs text-slate-500">Available publications</p>
              </div>
              <div className="rounded-2xl border border-violet-300/15 bg-violet-300/5 p-4">
                <p className="text-xs text-violet-200/80">Premium library</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{premiumCount}</p>
                <p className="mt-1 text-xs text-slate-500">Members-only reports</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-slate-500">Access status</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{!user ? "Explore public previews" : hasPremium ? "Premium research access active" : "Free member access"}</p>
                  {!user ? <Link href="/pricing" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">View membership →</Link> : hasPremium ? <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">PREMIUM</span> : <Link href="/pricing" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Explore Premium →</Link>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {latest && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Latest publication</p>
              <span className="text-xs text-slate-500">{formatDate(latest.published_at)}</span>
            </div>
            <Link href={"/analysis/" + latest.slug} className="group grid gap-5 rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-[#10243a] to-[#10182a] p-5 transition hover:border-cyan-300/35 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">{categories.find((category) => category.key === latest.category)?.name || "Research"}</span>
                  {latest.is_premium_only && <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">PREMIUM</span>}
                  {latest.video_url && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-400">VIDEO</span>}
                </div>
                <h2 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">{latest.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{latest.excerpt || "A detailed intermarket research note."}</p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition group-hover:translate-x-1">Open publication <span aria-hidden="true">→</span></span>
            </Link>
          </section>
        )}

        <section id="research-topics" className="mt-10 scroll-mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Browse the desk</p><h2 className="mt-2 text-2xl font-bold">Research topics</h2></div>
            <p className="text-xs text-slate-500">Select a topic to jump to its publications</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((category) => {
              const count = published.filter((article) => article.category === category.key).length;
              return <a key={category.key} href={"#" + category.key} className="group rounded-2xl border border-white/10 bg-[#0e1b2c] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[#12243a]">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold tracking-[.15em] text-cyan-300">{category.number}</span><span className="text-xs text-slate-500">{count} items</span></div>
                <h3 className="mt-4 text-sm font-bold leading-snug">{category.name}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{category.note}</p>
              </a>;
            })}
          </div>
        </section>

        <div className="mt-11 space-y-10">
          {categories.map((category) => {
            const list = published.filter((article) => article.category === category.key);
            return <section id={category.key} key={category.key} className="scroll-mt-5">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-300">{category.number} / Research category</p><h2 className="mt-1 text-xl font-bold">{category.name}</h2></div>
                <span className="text-xs text-slate-500">{list.length} {list.length === 1 ? "publication" : "publications"}</span>
              </div>
              {list.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((article) => {
                  const canRead = Boolean(user) && (hasPremium || !article.is_premium_only);
                  const action = canRead ? "Read research" : article.is_premium_only ? "View preview" : user ? "Read research" : "Sign in to read";
                  return <article key={article.id} className="group flex min-h-[250px] flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#122238] to-[#0b1727] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:shadow-[0_16px_45px_rgba(0,0,0,.2)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>{formatDate(article.published_at)}</span>
                      <div className="flex items-center gap-2">
                        {article.video_url && <span className="rounded-full border border-white/10 px-2 py-1 text-slate-400">Video</span>}
                        {article.is_premium_only ? <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-1 font-semibold text-violet-200">Premium</span> : <span className="rounded-full border border-emerald-300/15 bg-emerald-300/5 px-2 py-1 text-emerald-200">Member</span>}
                      </div>
                    </div>
                    <h3 className="mt-4 text-lg font-bold leading-snug transition group-hover:text-cyan-100">{article.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{article.excerpt || "A detailed intermarket research note."}</p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <span className="text-[11px] text-slate-500">{article.is_premium_only ? (hasPremium ? "Premium access included" : "Premium publication") : "Free member publication"}</span>
                      <Link href={"/analysis/" + article.slug} className="shrink-0 text-sm font-semibold text-cyan-300 transition hover:text-cyan-100">{action} <span aria-hidden="true">→</span></Link>
                    </div>
                  </article>;
                })}
              </div> : <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-5 py-7 text-sm text-slate-500">No publications in this category yet. New research will appear here when published.</div>}
            </section>;
          })}
        </div>

        <section className="mt-12 rounded-3xl border border-violet-300/15 bg-[radial-gradient(ellipse_at_top_right,_rgba(167,139,250,0.13),_transparent_45%),linear-gradient(110deg,#111d31,#10172a)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Go deeper</p><h2 className="mt-2 text-2xl font-bold">A fuller view of the intermarket picture.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Free members can access publications marked for the free library. Premium membership unlocks the complete Premium research collection and eligible video content.</p></div>
            <div className="flex shrink-0 flex-wrap gap-3">
              {user ? <><Link href="/dashboard" className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">Open AIS Terminal</Link>{!hasPremium && <Link href="/pricing" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold">Explore Premium</Link>}</> : <><Link href="/login" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold">Sign in</Link><Link href="/pricing" className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">View membership</Link></>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
