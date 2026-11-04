import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function DashboardPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:trades,error}=await supabase.from("private_trades").select("id,instrument,market,direction,status,created_at,thesis,fundamental_analysis,intermarket_analysis").order("created_at",{ascending:false}).limit(30);
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-6xl">
 <header className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/" className="text-xs tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link><h1 className="mt-4 text-3xl font-semibold">Your trading journal</h1><p className="mt-2 text-sm text-slate-400">Private workspace for {user.email}</p></div><form action="/auth/signout" method="post"><button className="rounded-lg border border-white/15 px-4 py-2 text-sm">Sign out</button></form></header>
 <div className="mt-8 flex flex-wrap gap-3"><Link href="/journal/new" className="rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white">+ Record a trade</Link><Link href="/setups" className="rounded-lg border border-white/15 px-4 py-3 text-sm">Public trade ideas</Link></div>
 <section className="mt-9"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Your saved setups</h2><span className="text-xs text-slate-500">Your account only</span></div>
 {error?<p className="rounded-xl border border-white/10 p-5 text-sm text-rose-300">Could not load trades. Check the database connection.</p>:trades?.length?<div className="grid gap-4 md:grid-cols-2">{trades.map(t=><article key={t.id} className="rounded-xl border border-white/10 bg-[#101a2a] p-5">
 <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-semibold">{t.instrument}</h3><p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{t.market.replaceAll("_"," ")} · {t.direction}</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{t.status.replaceAll("_"," ")}</span></div>
 {t.thesis&&<p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">{t.thesis}</p>}
 <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4"><span className="text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</span><Link href={"/journal/"+t.id} className="text-sm font-medium text-blue-300 hover:text-blue-200">View full setup →</Link></div>
 </article>)}</div>:<p className="rounded-xl border border-white/10 bg-[#101a2a] p-6 text-sm text-slate-400">No journal trades yet. Use Record a trade to add your first setup.</p>}</section>
 </div></main>;
}