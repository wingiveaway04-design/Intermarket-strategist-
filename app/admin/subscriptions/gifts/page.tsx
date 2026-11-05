"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = { user_id:string; email:string; display_name:string|null; username:string };
type Gift = { gift_id:string; user_id:string; email:string; display_name:string|null; starts_at:string; expires_at:string; reason:string|null; revoked_at:string|null; granted_by_email:string|null };

export default function AdminGiftsPage(){
 const supabase=useMemo(()=>createClient(),[]);
 const [term,setTerm]=useState("");
 const [members,setMembers]=useState<Member[]>([]);
 const [selected,setSelected]=useState<Member|null>(null);
 const [duration,setDuration]=useState("6");
 const [reason,setReason]=useState("");
 const [gifts,setGifts]=useState<Gift[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const loadGifts=useCallback(async()=>{
   const {data,error}=await supabase.rpc("admin_list_gifts");
   if(error){setError(error.message);return;}
   setGifts((data||[]) as Gift[]);
 },[supabase]);
 useEffect(()=>{void loadGifts();},[loadGifts]);
 async function search(){
   setError("");setMessage("");
   if(term.trim().length<2){setMembers([]);setError("Enter at least 2 characters to search.");return;}
   setBusy(true);
   const {data,error}=await supabase.rpc("admin_search_users",{search_term:term.trim()});
   if(error)setError(error.message);else {const found=(data||[]) as Member[];setMembers(found);if(found.length===0)setMessage("No registered member matched that email, username or display name.");}
   setBusy(false);
 }
 async function grant(){
   if(!selected)return;
   setBusy(true);setError("");setMessage("");
   const {error}=await supabase.rpc("admin_grant_gift_subscription",{
     target_user_id:selected.user_id,duration_months:Number(duration),gift_reason:reason.trim()||null,gift_start:new Date().toISOString()
   });
   if(error)setError(error.message);
   else{setMessage("Premium gift successfully granted to "+selected.email+".");setSelected(null);setReason("");setMembers([]);setTerm("");await loadGifts();}
   setBusy(false);
 }
 async function revoke(id:string){
   if(!window.confirm("Revoke this Premium gift immediately?"))return;
   setBusy(true);setError("");setMessage("");
   const {data,error}=await supabase.rpc("admin_revoke_gift_subscription",{gift_id:id});
   if(error)setError(error.message);else if(data){setMessage("Gift access revoked.");await loadGifts();}else setError("This gift was already revoked or could not be found.");
   setBusy(false);
 }
 const date=(value:string)=>new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-6xl">
  <Link href="/admin" className="text-sm text-cyan-300">← Administrator workspace</Link>
  <header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Premium access management</p><h1 className="mt-2 text-3xl font-bold">Gift subscriptions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Grant complimentary Premium access to registered members. Every grant is recorded with its administrator, start date, expiry date and optional reason.</p></header>
  <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5 md:p-6">
   <h2 className="text-lg font-semibold">Grant a Premium gift</h2>
   <p className="mt-1 text-sm text-slate-400">Search by the member's email, username or display name.</p>
   <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={term} onChange={e=>setTerm(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();void search();}}} placeholder="Enter email, username or display name..." className="field flex-1"/><button onClick={search} disabled={busy} className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">Search members</button></div>
   {members.length>0&&<div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">{members.map(m=><button key={m.user_id} onClick={()=>setSelected(m)} className={"flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-white/5 "+(selected?.user_id===m.user_id?"bg-cyan-400/10":"")}><span><span className="block font-medium">{m.display_name||"Member"}</span><span className="text-xs text-slate-400">{m.email}{m.username?" · @"+m.username:""}</span></span><span className="text-xs text-cyan-300">{selected?.user_id===m.user_id?"Selected":"Select"}</span></button>)}</div>}
   {selected&&<div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-4"><p className="text-xs uppercase tracking-wider text-cyan-300">Selected member</p><p className="mt-1 font-semibold">{selected.email}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Gift duration<select value={duration} onChange={e=>setDuration(e.target.value)} className="field mt-2"><option value="1">1 month</option><option value="6">6 months</option><option value="12">12 months</option></select></label><label className="text-sm">Internal reason (optional)<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={240} className="field mt-2" placeholder="e.g. Founding member reward"/></label></div><div className="mt-4 flex flex-wrap gap-3"><button onClick={grant} disabled={busy} className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy?"Processing...":"Grant Premium access"}</button><button onClick={()=>setSelected(null)} className="rounded-lg border border-white/15 px-5 py-3 text-sm">Cancel</button></div></div>}
   {message&&<p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}{error&&<p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
  </section>
  <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Gift history</h2><p className="mt-1 text-sm text-slate-400">Latest 200 gifts, including expired and revoked grants.</p></div><button onClick={()=>void loadGifts()} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Refresh</button></div>
   <div className="mt-4 space-y-3">{gifts.length===0?<p className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">No gift subscriptions have been issued yet.</p>:gifts.map(g=><article key={g.gift_id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{g.email}</p><p className="mt-1 text-xs text-slate-400">{g.display_name||"Member"} · Granted by {g.granted_by_email||"Administrator"}</p></div><span className={"rounded-full px-3 py-1 text-xs "+(g.revoked_at?"bg-rose-400/10 text-rose-300":new Date(g.expires_at)>new Date()?"bg-emerald-400/10 text-emerald-300":"bg-slate-400/10 text-slate-300")}>{g.revoked_at?"Revoked":new Date(g.expires_at)>new Date()?"Active":"Expired"}</span></div><div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2"><p>Starts: {date(g.starts_at)}</p><p>Expires: {date(g.expires_at)}</p></div>{g.reason&&<p className="mt-2 text-sm text-slate-300">Reason: {g.reason}</p>}{!g.revoked_at&&new Date(g.expires_at)>new Date()&&<button disabled={busy} onClick={()=>void revoke(g.gift_id)} className="mt-4 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10">Revoke gift</button>}</article>)}</div>
  </section>
 </div></main>;
}
