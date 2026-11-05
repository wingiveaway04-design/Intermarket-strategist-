"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const markets=["forex","commodities","equities","indices","cryptocurrency","fixed_income","other"];
const statuses=["in_progress","all_targets_hit","stopped_out","breakeven","closed_manually","cancelled"];

export default function EditPublicTradePage(){
  const params=useParams<{id:string}>();
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [trade,setTrade]=useState<any>(null);
  const [targets,setTargets]=useState<string[]>(["","",""]);
  useEffect(()=>{(async()=>{
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace("/login");return;}
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profile?.role!=="admin"){router.replace("/dashboard");return;}
    const [{data,error:tradeError},{data:targetRows,error:targetError}]=await Promise.all([
      supabase.from("public_trades").select("*").eq("id",params.id).maybeSingle(),
      supabase.from("trade_targets").select("target_number,price").eq("public_trade_id",params.id).order("target_number")
    ]);
    if(tradeError||targetError||!data){setError(tradeError?.message||targetError?.message||"Trade not found.");setLoading(false);return;}
    setTrade(data);
    const values=["","",""];
    (targetRows||[]).forEach((t:any)=>{if(t.target_number>=1&&t.target_number<=3)values[t.target_number-1]=String(t.price);});
    setTargets(values);setLoading(false);
  })();},[params.id,router]);
  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(!trade)return;setSaving(true);setError("");
    const f=new FormData(e.currentTarget);const supabase=createClient();
    const numeric=(v:FormDataEntryValue|null)=>v&&String(v).trim()?Number(v):null;
    const published=f.get("content_state")==="published";
    const patch={
      instrument:String(f.get("instrument")||"").trim().toUpperCase(),
      market:f.get("market"),direction:f.get("direction"),status:f.get("status"),
      entry_price:numeric(f.get("entry")),stop_loss:numeric(f.get("stop")),
      thesis:String(f.get("thesis")||""),fundamental_analysis:String(f.get("fundamental")||""),
      intermarket_analysis:String(f.get("intermarket")||""),
      content_state:published?"published":"draft",
      published_at:published?(trade.published_at||new Date().toISOString()):null
    };
    const {error:updateError}=await supabase.from("public_trades").update(patch).eq("id",params.id);
    if(updateError){setError("Could not update trade: "+updateError.message);setSaving(false);return;}
    const {error:deleteError}=await supabase.from("trade_targets").delete().eq("public_trade_id",params.id);
    if(deleteError){setError("Trade details saved, but old targets could not be replaced: "+deleteError.message);setSaving(false);return;}
    const rows=targets.map((v,i)=>({v:v.trim(),i})).filter(x=>x.v).map(x=>({public_trade_id:params.id,target_number:x.i+1,price:Number(x.v)}));
    if(rows.length){const {error:insertError}=await supabase.from("trade_targets").insert(rows);if(insertError){setError("Trade saved, but targets could not be saved: "+insertError.message);setSaving(false);return;}}
    router.push("/admin");router.refresh();
  }
  if(loading)return <main className="min-h-screen p-8 text-slate-300">Loading trade…</main>;
  if(!trade)return <main className="min-h-screen p-8"><p className="text-rose-300">{error||"Trade not found."}</p><Link href="/admin" className="mt-4 inline-block text-blue-300">Back to admin</Link></main>;
  return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-3xl"><Link href="/admin" className="text-xs text-blue-300">← ADMIN WORKSPACE</Link><h1 className="mt-5 text-3xl font-semibold">Edit official trade</h1><form onSubmit={save} className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-[#101a2a] p-5 sm:grid-cols-2">
    <label className="text-sm sm:col-span-2">Instrument<input name="instrument" required defaultValue={trade.instrument} className="field mt-2"/></label>
    <label className="text-sm">Market<select name="market" defaultValue={trade.market} className="field mt-2">{markets.map(m=><option key={m} value={m}>{m.replaceAll("_"," ")}</option>)}</select></label>
    <label className="text-sm">Direction<select name="direction" defaultValue={trade.direction} className="field mt-2"><option value="long">Long</option><option value="short">Short</option></select></label>
    <label className="text-sm">Status<select name="status" defaultValue={trade.status} className="field mt-2">{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
    <label className="text-sm">Publication<select name="content_state" defaultValue={trade.content_state} className="field mt-2"><option value="draft">Draft</option><option value="published">Published</option></select></label>
    <label className="text-sm">Entry price<input name="entry" type="number" step="any" defaultValue={trade.entry_price??""} className="field mt-2"/></label>
    <label className="text-sm">Stop loss<input name="stop" type="number" step="any" defaultValue={trade.stop_loss??""} className="field mt-2"/></label>
    {targets.map((v,i)=><label key={i} className="text-sm">Take profit {i+1}<input type="number" step="any" value={v} onChange={e=>setTargets(old=>old.map((x,j)=>j===i?e.target.value:x))} className="field mt-2"/></label>)}
    <label className="text-sm sm:col-span-2">Trade thesis<textarea name="thesis" rows={3} defaultValue={trade.thesis??""} className="field mt-2"/></label>
    <label className="text-sm sm:col-span-2">Fundamental analysis<textarea name="fundamental" rows={4} defaultValue={trade.fundamental_analysis??""} className="field mt-2"/></label>
    <label className="text-sm sm:col-span-2">Intermarket analysis<textarea name="intermarket" rows={4} defaultValue={trade.intermarket_analysis??""} className="field mt-2"/></label>
    {error&&<p role="alert" className="text-sm text-rose-300 sm:col-span-2">{error}</p>}
    <div className="flex gap-3 sm:col-span-2"><button disabled={saving} className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold disabled:opacity-50">{saving?"Saving…":"Save changes"}</button><Link href="/admin" className="rounded-lg border border-white/15 px-5 py-3 text-sm">Cancel</Link></div>
  </form></div></main>;
}
