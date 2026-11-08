import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import SessionCalendar from "@/components/session-calendar";
import SessionVideoPlayer from "@/components/session-video-player";

export default async function SessionsPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
 const isAdmin=profile?.role==="admin";
 const {data:premium}=await supabase.rpc("has_premium_access",{check_user_id:user.id});
 if(!premium&&!isAdmin){
  const {data:freeSessions}=await supabase.from("video_sessions").select("id").eq("publication_status","published").eq("access_level","free").limit(1);
  if(!freeSessions?.length)redirect("/pricing");
 }
 const {data:sessions,error}=await supabase.from("video_sessions")
  .select("id,title,description,session_type,market_focus,starts_at,duration_minutes,join_url,recording_url,access_level,publication_status")
  .eq("publication_status","published").order("starts_at",{ascending:true});
 const accessible=(sessions||[]).filter(s=>isAdmin||premium||s.access_level==="free");
 const live=accessible.filter(s=>s.session_type==="live");
 const recorded=accessible.filter(s=>s.session_type==="recorded");
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-5xl">
  <Link href="/dashboard" className="text-sm text-cyan-300">← AIS Terminal</Link>
  <header className="mt-6"><p className="text-xs uppercase tracking-[.2em] text-cyan-300">AIS Terminal · Video Room</p><h1 className="mt-2 text-3xl font-semibold">Live & Recorded Sessions</h1><p className="mt-2 text-sm text-slate-400">Join analyst briefings and revisit market education, macro outlooks and intermarket reviews.</p></header>
  {isAdmin&&<Link href="/admin/sessions" className="mt-5 inline-block rounded-lg border border-cyan-300/30 px-4 py-2.5 text-sm text-cyan-200">Manage sessions ↗</Link>}
  {error&&<p className="mt-5 text-sm text-rose-300">Sessions could not be loaded. Please refresh.</p>}
  <SessionCalendar sessions={live.map(s=>({id:s.id,title:s.title,starts_at:s.starts_at,duration_minutes:s.duration_minutes,market_focus:s.market_focus||[],access_level:s.access_level,join_url:s.join_url}))}/>
  <section className="mt-9"><h2 className="text-xl font-semibold">Upcoming & live briefings</h2><p className="mt-1 text-xs text-slate-500">Scheduled market discussions and live analyst sessions.</p><div className="mt-4 grid gap-3">
   {live.length?live.map(s=><article key={s.id} className="rounded-xl border border-white/10 bg-[#101a2a] p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] uppercase text-cyan-200">Live briefing</span>{s.access_level==="premium"&&<span className="rounded-full border border-amber-300/20 px-2.5 py-1 text-[10px] text-amber-200">Premium</span>}</div><h3 className="mt-3 text-lg font-semibold">{s.title}</h3>{s.description&&<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{s.description}</p>}{s.market_focus?.length>0&&<p className="mt-3 text-xs text-slate-500">Topics: {s.market_focus.join(" · ")}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">{s.starts_at&&<span>{new Date(s.starts_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}{s.duration_minutes?" · "+s.duration_minutes+" min":""}</span>}{s.join_url?<a href={s.join_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950">Join session ↗</a>:<span>Session link will be added soon</span>}</div></article>):<p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-500">No live sessions have been published yet.</p>}
  </div></section>
  <section className="mt-9"><h2 className="text-xl font-semibold">Session library</h2><p className="mt-1 text-xs text-slate-500">Watch recorded briefings, market breakdowns and educational sessions directly inside AIS Terminal.</p><div className="mt-4 grid gap-4 md:grid-cols-2">
   {recorded.length?recorded.map(s=><article key={s.id} className="rounded-xl border border-white/10 bg-[#101a2a] p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-300/10 px-2.5 py-1 text-[10px] uppercase text-violet-200">Recording</span>{s.access_level==="premium"&&<span className="rounded-full border border-amber-300/20 px-2.5 py-1 text-[10px] text-amber-200">Premium</span>}</div><h3 className="mt-3 text-lg font-semibold">{s.title}</h3>{s.description&&<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{s.description}</p>}{s.market_focus?.length>0&&<p className="mt-3 text-xs text-slate-500">Topics: {s.market_focus.join(" · ")}</p>}{s.duration_minutes&&<p className="mt-3 text-xs text-slate-500">{s.duration_minutes} minutes</p>}{s.recording_url?<SessionVideoPlayer url={s.recording_url} title={s.title}/>:<p className="mt-4 rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">Recording coming soon.</p>}</article>):<p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-500 md:col-span-2">No recordings have been published yet.</p>}
  </div></section>
 </div></main>
}
