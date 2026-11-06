"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
const markets=["forex","commodities","equities","indices","cryptocurrency","fixed_income","other"];
export default function NewTradePage(){
 const router=useRouter();const [error,setError]=useState("");const [saving,setSaving]=useState(false);const [imageName,setImageName]=useState("");
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setError("");const f=new FormData(e.currentTarget);const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();if(!user){setError("Please sign in again.");setSaving(false);return;}
  const image=f.get("setup_image");
  if(image instanceof File&&image.size>0){
   const ext=image.name.split(".").pop()?.toLowerCase()||"";
   const allowed=["jpg","jpeg","png","webp","gif","avif","heic","heif","bmp","tif","tiff","ico"];
   if(image.type==="image/svg+xml"||!allowed.includes(ext)||image.size>50*1024*1024){
    setError("Choose a supported image (JPG, PNG, WEBP, GIF, AVIF, HEIC, BMP, TIFF or ICO) up to 50 MB. SVG files are not accepted.");
    setSaving(false);return;
   }
  }
  const n=(v:FormDataEntryValue|null)=>v&&String(v).trim()?Number(v):null;
  const status=String(f.get("status"));
  const attribution=String(f.get("news_trade_attribution")||"not_news");
  const eventType=String(f.get("news_event_type")||"").trim();
  const eventName=String(f.get("news_event_name")||"").trim();
  const realizedR=n(f.get("realized_r"));
  const completed=["all_targets_hit","stopped_out","breakeven","closed_manually"].includes(status);
  if(attribution==="direct_news"&&(!eventType||!eventName)){setError("For a direct news trade, select the event type and enter the specific event name.");setSaving(false);return;}
  if(completed&&realizedR===null){setError("Enter the realized R result for a completed trade. Use 0 for breakeven.");setSaving(false);return;}
  const eventAt=String(f.get("news_event_at")||"");
  const {data:trade,error:err}=await supabase.from("private_trades").insert({owner_id:user.id,instrument:String(f.get("instrument")).trim().toUpperCase(),market:f.get("market"),direction:f.get("direction"),status,entry_price:n(f.get("entry")),stop_loss:n(f.get("stop")),thesis:f.get("thesis"),fundamental_analysis:f.get("fundamental"),intermarket_analysis:f.get("intermarket"),news_trade_attribution:attribution,news_event_type:attribution==="direct_news"?eventType:null,news_event_name:attribution==="direct_news"?eventName:null,news_event_at:eventAt?new Date(eventAt).toISOString():null,realized_r:realizedR,closed_at:completed?new Date().toISOString():null}).select("id").single();
  if(err||!trade){setError(err?.message||"Unable to save trade.");setSaving(false);return;}
  const prices=[f.get("tp1"),f.get("tp2"),f.get("tp3")].filter(v=>v&&String(v).trim());
  if(prices.length){const {error:te}=await supabase.from("trade_targets").insert(prices.map((p,i)=>({private_trade_id:trade.id,target_number:i+1,price:Number(p)})));if(te){setError("Trade saved, but target save failed: "+te.message);setSaving(false);return;}}
  if(image instanceof File&&image.size>0){
   const ext=image.name.split(".").pop()?.toLowerCase()||"jpg";
   const contentTypes:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif",heic:"image/heic",heif:"image/heif",bmp:"image/bmp",tif:"image/tiff",tiff:"image/tiff",ico:"image/x-icon"};
   const contentType=contentTypes[ext]||image.type||"image/jpeg";const path=user.id+"/"+trade.id+"/"+crypto.randomUUID()+"."+ext;
   const {error:up}=await supabase.storage.from("trade-journal").upload(path,image,{contentType,cacheControl:"3600",upsert:false});
   if(up){setError("Trade saved, but screenshot upload failed: "+up.message);setSaving(false);return;}
   const {error:ie}=await supabase.from("images").insert({owner_id:user.id,private_trade_id:trade.id,storage_path:path,visibility:"private"});
   if(ie){setError("Trade saved, but screenshot record failed: "+ie.message);setSaving(false);return;}
  }
  router.push("/dashboard");router.refresh();
 }
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="text-xs text-blue-300">← BACK TO JOURNAL</Link><h1 className="mt-5 text-3xl font-semibold">Record a trade</h1><p className="mt-2 text-sm text-slate-400">Private to your account. Save your full reasoning and chart screenshot.</p><form onSubmit={save} className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-[#101a2a] p-5 sm:grid-cols-2">
<label className="text-sm">Instrument<input name="instrument" required placeholder="EURUSD, XAUUSD, NAS100" className="field mt-2"/></label>
<label className="text-sm">Market<select name="market" className="field mt-2">{markets.map(m=><option key={m} value={m}>{m.replace("_"," ")}</option>)}</select></label>
<label className="text-sm">Direction<select name="direction" className="field mt-2"><option value="long">Long</option><option value="short">Short</option></select></label>
<label className="text-sm">Status<select name="status" className="field mt-2"><option value="in_progress">In progress</option><option value="all_targets_hit">All targets hit</option><option value="stopped_out">Stopped out</option><option value="breakeven">Breakeven</option><option value="closed_manually">Closed manually</option><option value="cancelled">Cancelled</option></select></label>
<label className="text-sm">Entry price<input name="entry" type="number" step="any" className="field mt-2"/></label><label className="text-sm">Stop loss<input name="stop" type="number" step="any" className="field mt-2"/></label>
<section className="sm:col-span-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-4"><h2 className="text-sm font-semibold text-cyan-200">News-trade classification</h2><p className="mt-1 text-xs leading-5 text-slate-400">Only trades directly taken because of a scheduled or unscheduled news release count toward the News Trading Barometer.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Relationship to news<select name="news_trade_attribution" className="field mt-2"><option value="not_news">Not a news trade</option><option value="direct_news">Direct news trade — include in Barometer</option><option value="event_context">Market context only — exclude from Barometer</option></select></label><label className="text-sm">Economic event<select name="news_event_type" className="field mt-2"><option value="">Select event type</option>{["NFP","CPI","Core CPI","PCE","Core PCE","FOMC Rate Decision","FOMC Press Conference","FOMC Minutes","GDP","Retail Sales","PPI","ISM PMI","Employment Data","Central Bank Decision","Other"].map(v=><option key={v} value={v}>{v}</option>)}</select></label><label className="text-sm">Specific event name<input name="news_event_name" placeholder="e.g. US October 2026 NFP" className="field mt-2"/></label><label className="text-sm">Event release time<input name="news_event_at" type="datetime-local" className="field mt-2"/></label></div></section>
<label className="text-sm">Realized result (R)<input name="realized_r" type="number" step="0.01" placeholder="e.g. 2, -1 or 0" className="field mt-2"/><span className="mt-1 block text-xs text-slate-500">Required for completed trades. Positive = win, negative = loss, zero = breakeven. Enter the final combined result after partial exits.</span></label>
{["tp1","tp2","tp3"].map((x,i)=><label key={x} className="text-sm">Take profit {i+1}<input name={x} type="number" step="any" className="field mt-2"/></label>)}
<label className="text-sm sm:col-span-2">Trade thesis<textarea name="thesis" rows={3} placeholder="Why are you taking this trade?" className="field mt-2"/></label>
<label className="text-sm sm:col-span-2">Fundamental analysis<textarea name="fundamental" rows={4} placeholder="Macro data, central-bank expectations and fundamental drivers..." className="field mt-2"/></label>
<label className="text-sm sm:col-span-2">Intermarket analysis<textarea name="intermarket" rows={4} placeholder="DXY, yields, equities, commodities and cross-market signals..." className="field mt-2"/></label>
<label className="text-sm sm:col-span-2">Setup screenshot<input name="setup_image" type="file" accept="image/*" className="field mt-2" onChange={e=>setImageName(e.target.files?.[0]?.name||"")}/><span className="mt-1 block text-xs text-slate-500">TradingView JPG/JPEG and other common chart images accepted · Up to 50 MB · Private to your journal</span>{imageName&&<span className="mt-1 block text-xs text-blue-300">Selected: {imageName}</span>}</label>
{error&&<p role="alert" className="text-sm text-rose-300 sm:col-span-2">{error}</p>}<div className="flex gap-3 sm:col-span-2"><button disabled={saving} className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold disabled:opacity-50">{saving?"Saving...":"Save private trade"}</button><Link href="/dashboard" className="rounded-lg border border-white/15 px-5 py-3 text-sm">Cancel</Link></div>
</form></div></main>;
}