import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import VideoSessionsManager from "@/components/video-sessions-manager";
export default async function AdminSessionsPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profile?.role!=="admin")redirect("/dashboard");
 const {data:sessions}=await supabase.from("video_sessions").select("id,title,description,session_type,market_focus,starts_at,duration_minutes,join_url,recording_url,access_level,publication_status").order("created_at",{ascending:false});
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-6xl"><Link href="/admin" className="text-xs tracking-wider text-cyan-300">← ADMIN WORKSPACE</Link><p className="mt-6 text-xs uppercase tracking-[.2em] text-cyan-300">AIS Terminal · Sessions</p><h1 className="mt-2 text-3xl font-semibold">Live & Recorded Sessions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Schedule analyst briefings and publish recorded market sessions. Drafts remain private until published.</p><VideoSessionsManager initial={sessions||[]}/></div></main>
}