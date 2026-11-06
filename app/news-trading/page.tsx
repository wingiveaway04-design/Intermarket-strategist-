import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

const label=(v:string)=>v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
export default async function NewsTradingPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const [{data:profile},{data:premium}] = await Promise.all([
  supabase.from("profiles").select("role").eq("id",user.id).maybeSingle(),
  supabase.rpc("has_premium_access",{check_user_id:user.id})
 ]);
 const entitled=Boolean(premium)||profile?.role==="admin";
 if(!entitled)return <main className="min-h-screen px-5 py-12 md:px-12"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="text-sm text-cyan-300">← Dashboard</Link><section className="mt-10 rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 via-slate-900 to-cyan-400/5 p-8 md:p-12"><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-200">Premium member library</p><h1 className="mt-4 text-3xl font-bold">News & Macro Intelligence</h1><p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">This library contains the analyst's exclusive NFP, CPI, FOMC and other event outlooks, intermarket scenarios, live updates and post-event reviews. Premium members can access all Premium and Free publications.</p><Link href="/pricing" className="mt-7 inline-flex rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">Explore Premium access</Link></section></div></main>;
 const {data:items,error}=await supabase.from("news_setups").select("*").eq("publication_status","published").order("published_at",{ascending:false}).limit(100);
 const cards=await Promise.all((items??[]).map(async item=>{
  let cover:string|null=null;
  if(item.cover_image_path){const {data}=await supabase.storage.from("news-macro-media").createSignedUrl(item.cover_image_path,3600);cover=data?.signedUrl||null;}
  return {...item,cover};
 }));
 return <main className="min-h-screen px-5 py-10 text-slate-100 md:px-12"><div className="mx-auto max-w-5xl">
  <Link href="/dashboard" className="text-xs tracking-wider text-cyan-300">← MEMBER DASHBOARD</Link>
  <div className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-[#14253a] via-[#0d1728] to-[#14253a] p-7 md:p-10"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Premium research desk</p><h1 className="mt-3 text-3xl font-bold md:text-4xl">News & Macro Intelligence</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Exclusive pre-event outlooks, live event updates and post-event reviews. Each publication separates the macro thesis from the market confirmation required to execute.</p><div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300"><span className="rounded-full border border-white/10 px-3 py-1.5">NFP · CPI · PCE</span><span className="rounded-full border border-white/10 px-3 py-1.5">FOMC · Central banks</span><span className="rounded-full border border-white/10 px-3 py-1.5">Gold · FX · Indices · Rates</span></div></div>
  {error&&<p role="alert" className="mt-8 rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error.message}</p>}
  {!cards.length&&!error&&<div className="mt-8 rounded-2xl border border-white/10 bg-[#101a2a] p-8 text-center text-sm text-slate-400">No News & Macro publications have been published yet.</div>}
  <div className="mt-8 grid gap-5">{cards.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#101a2a]">
   {item.cover&&<img src={item.cover} alt={item.title+" macro research cover"} className="max-h-[420px] w-full object-cover"/>}
   <div className="p-5 md:p-7"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-200">{label(item.event_type)}</span><span className="rounded-full bg-violet-400/10 px-3 py-1 text-violet-200">{label(item.phase)}</span><span className={item.access_level==="premium"?"rounded-full bg-amber-300/10 px-3 py-1 text-amber-200":"rounded-full bg-emerald-300/10 px-3 py-1 text-emerald-200"}>{item.access_level==="premium"?"Premium publication":"Member publication"}</span><span className="text-slate-500">{item.release_at?new Date(item.release_at).toLocaleString():"Release time not specified"}</span></div>
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
   <p className="mt-5 text-xs text-slate-500">Published {item.published_at?new Date(item.published_at).toLocaleDateString():""}</p></div>
  </article>)}</div>
 </div></main>;
}
