import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function JournalTradeDetail({params}:{params:{id:string}}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:trade}=await supabase.from("private_trades").select("*").eq("id",params.id).single();if(!trade)notFound();
 const [{data:targets},{data:images}]=await Promise.all([
  supabase.from("trade_targets").select("target_number,price,status").eq("private_trade_id",trade.id).order("target_number"),
  supabase.from("images").select("storage_path").eq("private_trade_id",trade.id).eq("owner_id",user.id)
 ]);
 const imageUrls=await Promise.all((images||[]).map(async image=>{const {data}=await supabase.storage.from("trade-journal").createSignedUrl(image.storage_path,3600);return data?.signedUrl||null;}));
 const section=(title:string,body:string|null)=><section className="rounded-xl border border-white/10 bg-[#101a2a] p-5"><h2 className="font-semibold">{title}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{body||"No notes added."}</p></section>;
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-4xl"><Link href="/dashboard" className="text-xs text-blue-300">← BACK TO JOURNAL</Link><div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{trade.instrument}</h1><p className="mt-2 text-sm uppercase tracking-wider text-slate-500">{trade.market.replaceAll("_"," ")} · {trade.direction}</p></div><span className="rounded-full bg-white/5 px-4 py-2 text-sm">{trade.status.replaceAll("_"," ")}</span></div>
 <section className="mt-7 rounded-xl border border-white/10 bg-[#101a2a] p-5"><h2 className="font-semibold">Trade levels</h2><div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-slate-500">Entry</p><p className="mt-1">{trade.entry_price??"—"}</p></div><div><p className="text-xs text-slate-500">Stop loss</p><p className="mt-1">{trade.stop_loss??"—"}</p></div>{(targets||[]).map(t=><div key={t.target_number}><p className="text-xs text-slate-500">Target {t.target_number} · {t.status}</p><p className="mt-1">{t.price}</p></div>)}</div></section>
 <div className="mt-5 grid gap-4">{section("Trade thesis",trade.thesis)}{section("Fundamental analysis",trade.fundamental_analysis)}{section("Intermarket analysis",trade.intermarket_analysis)}</div>
 {imageUrls.some(Boolean)&&<section className="mt-5 rounded-xl border border-white/10 bg-[#101a2a] p-5"><h2 className="font-semibold">Setup screenshots</h2><div className="mt-4 grid gap-4">{imageUrls.filter(Boolean).map((url,i)=><img key={i} src={url!} alt={"Trade setup screenshot "+(i+1)} className="h-auto w-full rounded-lg border border-white/10"/></div></section>}
 <p className="mt-5 text-xs text-slate-500">Recorded {new Date(trade.created_at).toLocaleString()}</p></div></main>;
}