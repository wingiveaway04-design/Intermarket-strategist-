import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const label = (v:string) => v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
export default async function NewsTradingPage() {
  const supabase = await createClient();
  const [{data:items,error},{data:{user}}] = await Promise.all([
    supabase.from("news_setups").select("*").eq("publication_status","published").order("published_at",{ascending:false}).limit(100),
    supabase.auth.getUser()
  ]);
  return <main className="min-h-screen px-5 py-10 text-slate-100 md:px-12"><div className="mx-auto max-w-5xl">
    <Link href="/" className="text-xs tracking-wider text-cyan-300">INTERMARKET STRATEGIST</Link>
    <nav className="mt-5 flex flex-wrap gap-4 text-sm"><Link href="/setups" className="text-slate-300">Trade Ideas</Link>{user&&<Link href="/dashboard" className="text-slate-300">Dashboard</Link>}</nav>
    <p className="mt-8 text-xs uppercase tracking-[.2em] text-cyan-300">Macro research and event execution</p>
    <h1 className="mt-3 text-4xl font-semibold">News & Macro Setups</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Structured pre-event outlooks, live updates and post-event reviews. Each publication distinguishes the macro thesis from the price confirmation required to trade.</p>
    {error&&<p role="alert" className="mt-8 rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error.message}</p>}
    {!items?.length&&!error&&<div className="mt-8 rounded-2xl border border-white/10 bg-[#101a2a] p-8 text-center text-sm text-slate-400">No News & Macro Setups have been published yet.</div>}
    <div className="mt-8 grid gap-5">{items?.map(item=><article key={item.id} className="rounded-2xl border border-white/10 bg-[#101a2a] p-5 md:p-7">
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-200">{label(item.event_type)}</span><span className="rounded-full bg-violet-400/10 px-3 py-1 text-violet-200">{label(item.phase)}</span><span className="text-slate-500">{item.release_at?new Date(item.release_at).toLocaleString():"Release time not specified"}</span></div>
      <h2 className="mt-4 text-2xl font-semibold">{item.title}</h2><p className="mt-1 text-sm text-slate-400">{item.event_name}</p>
      {!!item.market_focus?.length&&<p className="mt-4 text-xs text-cyan-200">Markets: {item.market_focus.join(" · ")}</p>}
      {(item.consensus||item.previous_value)&&<div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-sm"><div><p className="text-xs text-slate-500">Consensus</p><p className="mt-1">{item.consensus||"—"}</p></div><div><p className="text-xs text-slate-500">Previous</p><p className="mt-1">{item.previous_value||"—"}</p></div></div>}
      {item.macro_view&&<section className="mt-5"><h3 className="text-sm font-semibold text-cyan-200">Macro view</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{item.macro_view}</p></section>}
      {(item.scenario_hot||item.scenario_cool)&&<div className="mt-5 grid gap-4 md:grid-cols-2">{item.scenario_hot&&<section className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4"><h3 className="text-sm font-semibold text-rose-200">Hot / stronger scenario</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.scenario_hot}</p></section>}{item.scenario_cool&&<section className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4"><h3 className="text-sm font-semibold text-sky-200">Cooler / weaker scenario</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.scenario_cool}</p></section>}</div>}
      <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Trade bias</p><p className="mt-1 text-sm font-semibold">{label(item.trade_bias)}</p></div>{item.entry_plan&&<div><p className="text-xs text-slate-500">Entry plan</p><p className="mt-1 text-sm">{item.entry_plan}</p></div>}</div>
      {item.confirmation&&<section className="mt-4"><h3 className="text-sm font-semibold text-cyan-200">Confirmation required</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.confirmation}</p></section>}
      {(item.invalidation||item.stop_loss||item.targets)&&<section className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">{item.invalidation&&<div><p className="text-xs text-slate-500">Invalidation</p><p className="mt-1 text-sm">{item.invalidation}</p></div>}{item.stop_loss&&<div><p className="text-xs text-slate-500">Stop / risk boundary</p><p className="mt-1 text-sm">{item.stop_loss}</p></div>}{item.targets&&<div><p className="text-xs text-slate-500">Targets</p><p className="mt-1 text-sm">{item.targets}</p></div>}</section>}
      {item.risk_note&&<p className="mt-4 rounded-lg bg-amber-400/5 p-3 text-sm leading-6 text-amber-100/80">Risk note: {item.risk_note}</p>}
      {item.post_event_review&&<section className="mt-5 border-t border-white/10 pt-4"><h3 className="text-sm font-semibold text-violet-200">Post-event review</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.post_event_review}</p></section>}
      <p className="mt-5 text-xs text-slate-500">Published {item.published_at?new Date(item.published_at).toLocaleDateString():""}</p>
    </article>)}</div>
  </div></main>;
}
