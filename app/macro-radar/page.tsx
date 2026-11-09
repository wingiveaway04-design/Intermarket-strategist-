import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import MacroRadarBrowser from "./macro-radar-browser";

export default async function MacroRadarPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:events,error}=await supabase.from("economic_events").select("id,title,country,currency,category,impact,event_at,previous_value,consensus_value,actual_value,unit,source_url,notes,access_level,publication_status").eq("publication_status","published").order("event_at",{ascending:true}).limit(250);
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
 return <main className="min-h-screen bg-[#07111f] px-4 py-8 text-slate-100 sm:px-6 lg:px-10"><div className="mx-auto max-w-7xl">
  <Link href="/dashboard" className="text-xs font-semibold tracking-wider text-cyan-200">← AIS TERMINAL</Link>
  <header className="mt-6 rounded-3xl border border-cyan-200/15 bg-gradient-to-br from-[#15334a] via-[#101f32] to-[#101827] p-6 sm:p-8">
   <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200">AIS · Economic intelligence</p>
   <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold sm:text-4xl">Macro Event Radar</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Track the economic releases that can reprice rates, currencies, commodities and equity indices. Times are displayed in West Africa Time (WAT).</p></div>{profile?.role==="admin"&&<Link href="/admin/macro-radar" className="rounded-xl bg-cyan-200 px-4 py-3 text-xs font-bold text-[#071827]">Manage events ↗</Link>}</div>
   <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider"><span className="rounded-full border border-rose-300/25 bg-rose-300/10 px-3 py-1.5 text-rose-200">High impact</span><span className="rounded-full border border-orange-300/25 bg-orange-300/10 px-3 py-1.5 text-orange-200">Medium impact</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300">Low impact</span></div>
  </header>
  {error?<div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/5 p-5 text-sm text-rose-200">The event calendar could not be loaded. Please refresh the page.</div>:<MacroRadarBrowser events={events||[]}/>}
  <p className="mt-6 text-center text-[10px] text-slate-600">Calendar entries are maintained by the AIS analyst team. Verify release times and figures against the linked official source before trading.</p>
 </div></main>;
}
