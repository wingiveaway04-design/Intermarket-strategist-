"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const events = ["NFP","CPI","PCE","FOMC","RETAIL_SALES","PPI","GDP","ISM_PMI","OTHER"];
const field = "field mt-2";
type Setup = {
  id?: string; published_at?:string|null; title:string; event_type:string; event_name:string; release_at:string|null;
  phase:string; market_focus:string[]; consensus:string|null; previous_value:string|null;
  macro_view:string|null; scenario_hot:string|null; scenario_cool:string|null; trade_bias:string;
  confirmation:string|null; entry_plan:string|null; invalidation:string|null; stop_loss:string|null;
  targets:string|null; risk_note:string|null; post_event_review:string|null;
  publication_status:string; access_level:"free"|"premium"; cover_image_path:string|null; image_paths?:string[];
};
export default function NewsSetupForm({initial}:{initial?:Setup}) {
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [imageNames,setImageNames]=useState<string[]>([]);
  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError("");
    const form=new FormData(e.currentTarget); const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setError("Please sign in with your administrator account.");setSaving(false);return;}
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profile?.role!=="admin"){setError("Administrator access is required.");setSaving(false);return;}
    const rawDate=String(form.get("release_at")||"");
    const files=form.getAll("gallery_images").filter((x):x is File=>x instanceof File&&x.size>0);
    if(files.some(file=>!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type)||file.size>10*1024*1024)){
      setError("Each image must be JPG, PNG, WebP or AVIF and no larger than 10 MB.");setSaving(false);return;
    }
    const uploadedPaths:string[]=[];
    for(const file of files){
      const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
      const path=user.id+"/"+crypto.randomUUID()+"."+ext;
      const {error:uploadError}=await supabase.storage.from("news-macro-media").upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
      if(uploadError){
        if(uploadedPaths.length)await supabase.storage.from("news-macro-media").remove(uploadedPaths);
        setError("Image upload failed: "+uploadError.message);setSaving(false);return;
      }
      uploadedPaths.push(path);
    }
    const imagePaths=files.length?uploadedPaths:(initial?.image_paths||[]);
    const imagePath=files.length?(uploadedPaths[0]||null):(initial?.cover_image_path||null);
    const published=form.get("publication_status")==="published";
    const payload={
      title:String(form.get("title")||"").trim(),event_type:form.get("event_type"),
      event_name:String(form.get("event_name")||"").trim(),release_at:rawDate?new Date(rawDate).toISOString():null,
      phase:form.get("phase"),market_focus:String(form.get("market_focus")||"").split(",").map(x=>x.trim()).filter(Boolean),
      consensus:form.get("consensus"),previous_value:form.get("previous_value"),macro_view:form.get("macro_view"),
      scenario_hot:form.get("scenario_hot"),scenario_cool:form.get("scenario_cool"),trade_bias:form.get("trade_bias"),
      confirmation:form.get("confirmation"),entry_plan:form.get("entry_plan"),invalidation:form.get("invalidation"),
      stop_loss:form.get("stop_loss"),targets:form.get("targets"),risk_note:form.get("risk_note"),
      post_event_review:form.get("post_event_review"),publication_status:published?"published":"draft",
      access_level:form.get("access_level")==="free"?"free":"premium",cover_image_path:imagePath,image_paths:imagePaths,
      author_id:user.id,published_at:published?(initial?.published_at||new Date().toISOString()):null
    };
    if(!payload.title||!payload.event_name){setError("Add a publication title and event name.");setSaving(false);return;}
    const result=initial
      ? await supabase.from("news_setups").update(payload).eq("id",initial.id).select("id").single()
      : await supabase.from("news_setups").insert(payload).select("id").single();
    if(result.error||!result.data){
      if(uploadedPaths.length)await supabase.storage.from("news-macro-media").remove(uploadedPaths);
      setError(result.error?.message||"Could not save the publication.");setSaving(false);return;
    }
    if(files.length){const old=[initial?.cover_image_path,...(initial?.image_paths||[])].filter((x):x is string=>Boolean(x));if(old.length)await supabase.storage.from("news-macro-media").remove([...new Set(old)]);}
    router.push("/admin");router.refresh();
  }
  const v=(key:keyof Setup)=>initial?.[key]??"";
  const localDate=initial?.release_at?new Date(initial.release_at).toISOString().slice(0,16):"";
  return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-4xl">
    <Link href="/admin" className="text-xs tracking-wider text-cyan-300">← ADMIN WORKSPACE</Link>
    <p className="mt-6 text-xs uppercase tracking-[.2em] text-cyan-300">News & Macro Desk</p>
    <h1 className="mt-2 text-3xl font-semibold">{initial?"Edit News & Macro publication":"News Setup Builder"}</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Publish an institutional-style macro outlook, event update or post-event review. Choose exactly which registered members can read it and add a relevant editorial image.</p>
    <form onSubmit={save} className="mt-8 grid gap-5 rounded-2xl border border-white/10 bg-[#101a2a] p-5 md:grid-cols-2 md:p-7">
      <label className="text-sm md:col-span-2">Publication title<input name="title" required defaultValue={String(v("title"))} placeholder="US NFP — Labour market, rates and cross-market scenarios" className={field}/></label>
      <label className="text-sm">Economic event<select name="event_type" defaultValue={String(v("event_type")||"NFP")} className={field}>{events.map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label>
      <label className="text-sm">Event name<input name="event_name" required defaultValue={String(v("event_name"))} placeholder="US NFP — October 2026" className={field}/></label>
      <label className="text-sm">Release date and time<input name="release_at" type="datetime-local" defaultValue={localDate} className={field}/></label>
      <label className="text-sm">Publication phase<select name="phase" defaultValue={String(v("phase")||"pre_event_outlook")} className={field}><option value="pre_event_outlook">Pre-Event Outlook</option><option value="live_update">Live / Event Update</option><option value="post_event_review">Post-Event Review</option></select></label>
      <label className="text-sm md:col-span-2">Market focus<input name="market_focus" defaultValue={Array.isArray(v("market_focus"))?(v("market_focus") as string[]).join(", "):""} placeholder="Gold, Nasdaq, DXY, US 2Y, US 10Y" className={field}/></label>
      <label className="text-sm">Consensus / market expectation<input name="consensus" defaultValue={String(v("consensus"))} className={field}/></label>
      <label className="text-sm">Previous reading<input name="previous_value" defaultValue={String(v("previous_value"))} className={field}/></label>
      <label className="text-sm md:col-span-2">Macro view<textarea name="macro_view" rows={4} defaultValue={String(v("macro_view"))} className={field}/></label>
      <label className="text-sm md:col-span-2">Scenario A — hotter / stronger data<textarea name="scenario_hot" rows={3} defaultValue={String(v("scenario_hot"))} className={field}/></label>
      <label className="text-sm md:col-span-2">Scenario B — cooler / weaker data<textarea name="scenario_cool" rows={3} defaultValue={String(v("scenario_cool"))} className={field}/></label>
      <label className="text-sm">Trade bias<select name="trade_bias" defaultValue={String(v("trade_bias")||"conditional")} className={field}><option value="conditional">Conditional</option><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="neutral">Neutral</option></select></label>
      <label className="text-sm">Entry plan / trigger<input name="entry_plan" defaultValue={String(v("entry_plan"))} className={field}/></label>
      <label className="text-sm md:col-span-2">Intermarket / price confirmation<textarea name="confirmation" rows={3} defaultValue={String(v("confirmation"))} className={field}/></label>
      <label className="text-sm">Thesis invalidation<input name="invalidation" defaultValue={String(v("invalidation"))} className={field}/></label>
      <label className="text-sm">Stop loss / risk boundary<input name="stop_loss" defaultValue={String(v("stop_loss"))} className={field}/></label>
      <label className="text-sm md:col-span-2">Targets<input name="targets" defaultValue={String(v("targets"))} className={field}/></label>
      <label className="text-sm md:col-span-2">Risk note<textarea name="risk_note" rows={2} defaultValue={String(v("risk_note"))} className={field}/></label>
      <label className="text-sm md:col-span-2">Post-event review<textarea name="post_event_review" rows={3} defaultValue={String(v("post_event_review"))} className={field}/></label>
      <section className="rounded-xl border border-white/10 bg-black/15 p-4 md:col-span-2"><p className="text-sm font-semibold">Publication access</p><p className="mt-1 text-xs leading-5 text-slate-400">Free members can read Free publications. Premium members can read both Free and Premium publications. Visitors cannot read the full publication.</p><select name="access_level" defaultValue={initial?.access_level||"premium"} className={field}><option value="premium">Premium members only</option><option value="free">All registered members (Free + Premium)</option></select></section>
      <label className="text-sm md:col-span-2">Publication image gallery<input name="gallery_images" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className={field} onChange={e=>setImageNames(Array.from(e.target.files||[]).map(file=>file.name))}/><span className="mt-2 block text-xs leading-5 text-slate-500">Select multiple relevant editorial images at once: central-bank or Treasury imagery, economic-data visuals, yield curves, currency markets, gold, oil or equity-index trading. JPG, PNG, WebP or AVIF · maximum 10 MB per image. New selections replace the existing gallery.</span>{imageNames.length>0&&<span className="mt-1 block text-xs text-cyan-300">Selected: {imageNames.join(", ")}</span>}{(initial?.image_paths?.length||initial?.cover_image_path)&&<span className="mt-1 block text-xs text-slate-500">Existing gallery: {(initial?.image_paths||[initial?.cover_image_path].filter(Boolean)).length} image(s). Leave empty to keep it.</span>}</label>
      <label className="text-sm md:col-span-2">Publication status<select name="publication_status" defaultValue={String(v("publication_status")||"draft")} className={field}><option value="draft">Save as draft</option><option value="published">Publish now</option></select></label>
      {error&&<p role="alert" className="text-sm text-rose-300 md:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-3 md:col-span-2"><button disabled={saving} className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving?"Saving…":initial?"Save changes":"Save News Setup"}</button><Link href="/admin" className="rounded-lg border border-white/15 px-5 py-3 text-sm">Cancel</Link></div>
    </form>
  </div></main>;
}
