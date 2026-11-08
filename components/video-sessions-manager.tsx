"use client";
import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

type Session = {id:string;title:string;description:string|null;session_type:"live"|"recorded";market_focus:string[];starts_at:string|null;duration_minutes:number|null;join_url:string|null;recording_url:string|null;access_level:"free"|"premium";publication_status:"draft"|"published"|"cancelled"};
const field="mt-1 w-full rounded-lg border border-white/10 bg-[#081321] px-3 py-2.5 text-sm outline-none focus:border-cyan-300";
function localDate(value:string|null){return value?new Date(value).toISOString().slice(0,16):""}
export default function VideoSessionsManager({initial}:{initial:Session[]}) {
 const router=useRouter(); const [items,setItems]=useState(initial); const [editing,setEditing]=useState<Session|null>(null); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setError("");
  const form=new FormData(e.currentTarget);const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Please sign in again.");setSaving(false);return}
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role!=="admin"){setError("Administrator access is required.");setSaving(false);return}
  const type=String(form.get("session_type")) as "live"|"recorded";
  const title=String(form.get("title")||"").trim();
  const join=String(form.get("join_url")||"").trim()||null;
  const recording=String(form.get("recording_url")||"").trim()||null;
  if(!title){setError("Enter a session title.");setSaving(false);return}
  if(type==="live"&&join&&!/^https?:\/\//i.test(join)){setError("Join link must begin with https:// or http://.");setSaving(false);return}
  if(recording&&!/^https?:\/\//i.test(recording)){setError("Recording link must begin with https:// or http://.");setSaving(false);return}
  const raw=String(form.get("starts_at")||"");
  const payload={title,description:String(form.get("description")||"").trim()||null,session_type:type,market_focus:String(form.get("market_focus")||"").split(",").map(x=>x.trim()).filter(Boolean),starts_at:raw?new Date(raw).toISOString():null,duration_minutes:form.get("duration_minutes")?Number(form.get("duration_minutes")):null,join_url:type==="live"?join:null,recording_url:recording,access_level:String(form.get("access_level"))==="free"?"free":"premium",publication_status:String(form.get("publication_status")),created_by:user.id,updated_at:new Date().toISOString()};
  const result=editing?await supabase.from("video_sessions").update(payload).eq("id",editing.id).select().single():await supabase.from("video_sessions").insert(payload).select().single();
  if(result.error||!result.data){setError(result.error?.message||"Could not save session.");setSaving(false);return}
  setItems(old=>editing?old.map(x=>x.id===editing.id?result.data as Session:x):[result.data as Session,...old]);setEditing(null);formElement.reset();router.refresh();setSaving(false);
 }
 async function remove(id:string){if(!confirm("Permanently delete this session?"))return;const supabase=createClient();const {error}=await supabase.from("video_sessions").delete().eq("id",id);if(error){setError(error.message);return}setItems(old=>old.filter(x=>x.id!==id));router.refresh()}
 return <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
  <section className="rounded-2xl border border-white/10 bg-[#101a2a] p-5"><h2 className="text-lg font-semibold">{editing?"Edit session":"Create a session"}</h2><p className="mt-1 text-xs text-slate-400">Add a live briefing or publish a recording for members.</p>
   <form key={editing?.id||"new"} onSubmit={save} className="mt-5 grid gap-4">
    <label className="text-sm">Session title<input name="title" required defaultValue={editing?.title||""} className={field} placeholder="Weekly intermarket outlook"/></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Session type<select name="session_type" defaultValue={editing?.session_type||"live"} className={field}><option value="live">Live session</option><option value="recorded">Recorded session</option></select></label><label className="text-sm">Access<select name="access_level" defaultValue={editing?.access_level||"premium"} className={field}><option value="premium">Premium only</option><option value="free">All registered members</option></select></label></div>
    <label className="text-sm">Description<textarea name="description" rows={3} defaultValue={editing?.description||""} className={field}/></label>
    <label className="text-sm">Markets / topics<input name="market_focus" defaultValue={editing?.market_focus?.join(", ")||""} className={field} placeholder="Gold, Nasdaq, USD, yields"/></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Start date and time<input name="starts_at" type="datetime-local" defaultValue={localDate(editing?.starts_at||null)} className={field}/></label><label className="text-sm">Duration (minutes)<input name="duration_minutes" type="number" min="1" max="1440" defaultValue={editing?.duration_minutes||""} className={field}/></label></div>
    <label className="text-sm">Live join URL<input name="join_url" type="url" defaultValue={editing?.join_url||""} className={field} placeholder="https://…"/></label>
    <label className="text-sm">Recording URL<input name="recording_url" type="url" defaultValue={editing?.recording_url||""} className={field} placeholder="https://…"/></label>
    <label className="text-sm">Publication status<select name="publication_status" defaultValue={editing?.publication_status||"draft"} className={field}><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label>
    {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={saving} className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving?"Saving…":editing?"Save changes":"Create session"}</button>{editing&&<button type="button" onClick={()=>setEditing(null)} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm">Cancel edit</button>}</div>
   </form>
  </section>
  <section className="rounded-2xl border border-white/10 bg-[#101a2a] p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Session library</h2><Link href="/sessions" className="text-xs text-cyan-300">Member view ↗</Link></div>
   {items.length?<div className="mt-4 divide-y divide-white/10">{items.map(item=><div key={item.id} className="py-4"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-400">{item.session_type} · {item.access_level} · {item.publication_status}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>{setEditing(item);setError("")}} className="rounded-lg border border-cyan-300/30 px-3 py-1.5 text-xs text-cyan-200">Edit</button><button onClick={()=>remove(item.id)} className="rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs text-rose-200">Delete</button></div></div>)}</div>:<p className="mt-4 text-sm text-slate-400">No sessions yet. Create your first live briefing or recording.</p>}
  </section>
 </div>
}
