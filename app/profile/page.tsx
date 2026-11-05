import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import ProfileEditor from "@/components/profile-editor";
export default async function ProfilePage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:p}=await supabase.from("profiles").select("username,display_name,bio,avatar_path,role").eq("id",user.id).single();
 let avatarUrl:string|null=null;
 if(p?.avatar_path){const {data}=await supabase.storage.from("profile-avatars").createSignedUrl(p.avatar_path,3600);avatarUrl=data?.signedUrl||null;}
 return <main className="min-h-screen px-4 py-8 md:px-10 md:py-12"><div className="mx-auto max-w-4xl">
  <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard" className="text-sm text-cyan-300 hover:text-cyan-100">← Workspace</Link><Link href="/settings" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">Account settings →</Link></div>
  <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#122b42] via-[#111d30] to-[#17172e] p-6 md:p-8"><p className="text-[11px] font-semibold tracking-[.22em] text-cyan-200">INTERMARKET STRATEGIST · MEMBER IDENTITY</p><div className="mt-5 flex flex-wrap items-center gap-5">{avatarUrl?<img src={avatarUrl} alt="Your profile" className="h-20 w-20 rounded-2xl border border-white/15 object-cover"/>:<div className="grid h-20 w-20 place-items-center rounded-2xl bg-cyan-300/10 text-3xl font-semibold text-cyan-100">{(p?.display_name||p?.username||"M").slice(0,1).toUpperCase()}</div>}<div className="min-w-0"><h1 className="text-2xl font-semibold text-white md:text-3xl">{p?.display_name||"Your profile"}</h1><p className="mt-1 text-sm text-slate-300">@{p?.username||"username not set"} {p?.role==="admin"&&<span className="ml-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-2 py-1 text-[10px] font-semibold text-cyan-100">ANALYST / ADMIN</span>}</p><p className="mt-2 max-w-xl text-sm text-slate-400">{p?.bio||"Add a short introduction so other members can recognise you."}</p></div></div></section>
  <div className="mt-7"><div><h2 className="text-xl font-semibold">Profile details</h2><p className="mt-1 text-sm text-slate-400">Choose how your identity appears across the community and member discussions.</p></div><ProfileEditor userId={user.id} username={p?.username||""} displayName={p?.display_name||""} bio={p?.bio||""} avatarUrl={avatarUrl}/></div>
 </div></main>;
}