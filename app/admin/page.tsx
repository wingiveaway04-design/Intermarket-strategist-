import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
 if(profile?.role!=="admin") redirect("/dashboard");
 const {data:trades}=await supabase.from("public_trades").select("id,instrument,market,direction,status,content_state,created_at").order("created_at",{ascending:false}).limit(30);
 const {data:articles}=await supabase.from("analysis_articles").select("id,title,content_state,created_at").order("created_at",{ascending:false}).limit(20);
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-6xl"><Link href="/" className="text-xs tracking-[.16em] text-blue-300">INTERMARKET STRATEGIST</Link><h1 className="mt-5 text-3xl font-semibold">Administrator workspace</h1><p className="mt-2 text-sm text-slate-400">Manage the official public research and trade feed.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/admin/trades/new" className="rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold">+ Publish a trade</Link><Link href="/dashboard" className="rounded-lg border border-white/15 px-4 py-3 text-sm">My private journal</Link></div><section className="mt-8 rounded-xl border border-white/10 bg-[#101a2a] p-5"><h2 className="font-semibold">Official trade posts</h2>{trades?.length?<div className="mt-4 divide-y divide-white/10">{trades.map(t=><div key={t.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{t.instrument} · {t.market} · {t.direction}</span><span className="text-slate-400">{t.content_state} / {t.status.replaceAll("_"," ")}</span></div>)}</div>:<p className="mt-4 text-sm text-slate-400">No official trades yet.</p>}</section><section className="mt-5 rounded-xl border border-white/10 bg-[#101a2a] p-5"><h2 className="font-semibold">Research articles</h2>{articles?.length?<div className="mt-4 divide-y divide-white/10">{articles.map(a=><div key={a.id} className="py-3 text-sm">{a.title} <span className="text-slate-500">· {a.content_state}</span></div>)}</div>:<p className="mt-4 text-sm text-slate-400">No articles yet. Article publishing will be added in the next content milestone.</p>}</section></div></main>;
}
