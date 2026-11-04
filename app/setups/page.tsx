import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export default async function SetupsPage(){
 const supabase=await createClient();
 const {data:trades}=await supabase.from("public_trades").select("id,slug,instrument,market,direction,status,entry_price,stop_loss,published_at,thesis,fundamental_analysis,intermarket_analysis").eq("content_state","published").order("published_at",{ascending:false});
 const ids=(trades||[]).map(t=>t.id);
 const [{data:images},{data:targets}]=ids.length?await Promise.all([
  supabase.from("images").select("public_trade_id,storage_path").in("public_trade_id",ids).eq("visibility","public"),
  supabase.from("trade_targets").select("public_trade_id,target_number,price,status").in("public_trade_id",ids).order("target_number")
 ]):[{data:[]},{data:[]}];
 return <main className="min-h-screen px-6 py-12 md:px-12"><div className="mx-auto max-w-5xl"><Link href="/" className="text-xs tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link><h1 className="mt-6 text-4xl font-semibold">Official trade setups</h1><p className="mt-3 text-slate-400">Complete trade ideas published and managed by the site administrator.</p>
 <div className="mt-10 grid gap-5">{trades?.map(trade=><article key={trade.id} className="rounded-xl border border-white/10 bg-[#101a2a] p-6">
 <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-semibold">{trade.instrument}</h2><p className="mt-2 text-xs uppercase tracking-wider text-slate-500">{trade.market.replaceAll("_"," ")} · {trade.direction} · {trade.status.replaceAll("_"," ")}</p></div><span className={trade.direction==="long"?"text-emerald-400":"text-rose-400"}>{trade.direction.toUpperCase()}</span></div>
 <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-slate-500">Entry</p><p className="mt-1">{trade.entry_price??"—"}</p></div><div><p className="text-xs text-slate-500">Stop loss</p><p className="mt-1">{trade.stop_loss??"—"}</p></div>{(targets||[]).filter(t=>t.public_trade_id===trade.id).map(t=><div key={t.target_number}><p className="text-xs text-slate-500">Target {t.target_number} · {t.status}</p><p className="mt-1">{t.price}</p></div>)}</div>
 {trade.thesis&&<section className="mt-5 border-t border-white/10 pt-4"><h3 className="text-sm font-semibold">Trade thesis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.thesis}</p></section>}
 {trade.fundamental_analysis&&<section className="mt-5 border-t border-white/10 pt-4"><h3 className="text-sm font-semibold">Fundamental analysis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.fundamental_analysis}</p></section>}
 {trade.intermarket_analysis&&<section className="mt-5 border-t border-white/10 pt-4"><h3 className="text-sm font-semibold">Intermarket analysis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.intermarket_analysis}</p></section>}
 {(images||[]).filter(i=>i.public_trade_id===trade.id).map(i=><img key={i.storage_path} src={supabase.storage.from("public-trade-images").getPublicUrl(i.storage_path).data.publicUrl} alt={trade.instrument+" trade setup chart"} className="mt-5 h-auto w-full rounded-lg border border-white/10"/> )}
 <p className="mt-5 text-xs text-slate-500">Published {trade.published_at?new Date(trade.published_at).toLocaleDateString():""}</p></article>)}
 {!trades?.length&&<p className="rounded-xl border border-white/10 p-6 text-sm text-slate-400">No official trade setups have been published yet.</p>}</div></div></main>;
}