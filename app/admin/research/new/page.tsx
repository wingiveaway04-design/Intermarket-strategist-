"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const topics = [{id:"macro",name:"Macro"},{id:"rates",name:"Rates"},{id:"currencies",name:"Currencies"},{id:"commodities",name:"Commodities"},{id:"cross_market",name:"Cross-Market Perspectives"}];
const MAX_VIDEO = 500 * 1024 * 1024;

export default function AdminNewResearchPage() {
  const router=useRouter();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [videoName,setVideoName]=useState("");
  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const form=new FormData(e.currentTarget); const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setError("Please sign in with your administrator account.");setBusy(false);return;}
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    if(profile?.role!=="admin"){setError("Administrator access is required to publish research.");setBusy(false);return;}
    const title=String(form.get("title")||"").trim();
    const excerpt=String(form.get("excerpt")||"").trim();
    const body=String(form.get("body_md")||"").trim();
    const category=String(form.get("category")||"cross_market");
    const youtube=String(form.get("video_url")||"").trim();
    const file=form.get("video_file");
    if(youtube){try{const u=new URL(youtube);if(!["youtube.com","www.youtube.com","youtu.be","m.youtube.com"].includes(u.hostname)){throw new Error();}}catch{setError("Enter a valid YouTube video URL.");setBusy(false);return;}}
    if(file instanceof File && file.size>0 && (!file.type.startsWith("video/")||file.size>MAX_VIDEO)){setError("Choose a video file (MP4, WebM, MOV or MKV) up to 500 MB.");setBusy(false);return;}
    const slug=title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Date.now().toString(36);
    let videoPath:string|null=null;
    if(file instanceof File&&file.size>0){
      const ext=file.name.split(".").pop()?.toLowerCase()||"mp4";
      videoPath=user.id+"/"+crypto.randomUUID()+"."+ext;
      const {error:uploadError}=await supabase.storage.from("research-videos").upload(videoPath,file,{contentType:file.type,cacheControl:"3600",upsert:false});
      if(uploadError){setError("Video upload failed: "+uploadError.message);setBusy(false);return;}
    }
    const published=form.get("content_state")==="published";
    const {error:insertError}=await supabase.from("analysis_articles").insert({slug,title,excerpt,body_md:body,category,video_url:youtube||null,video_path:videoPath,author_id:user.id,content_state:published?"published":"draft",published_at:published?new Date().toISOString():null});
    if(insertError){setError("Could not save research: "+insertError.message);setBusy(false);return;}
    router.push("/admin");router.refresh();
  }
  return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-4xl"><Link href="/admin" className="text-sm text-cyan-300">← Admin workspace</Link><h1 className="mt-5 text-3xl font-bold">Publish research</h1><p className="mt-2 text-sm text-slate-400">Create a member-only research article, with an optional YouTube embed or direct video upload.</p>
  <form onSubmit={save} className="mt-7 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 md:grid-cols-2">
    <label className="text-sm md:col-span-2">Research title<input name="title" required maxLength={180} className="field mt-2" placeholder="e.g. Oil, real yields, and the gold outlook"/></label>
    <label className="text-sm">Category<select name="category" className="field mt-2">{topics.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label className="text-sm">Publication status<select name="content_state" className="field mt-2"><option value="draft">Save as draft</option><option value="published">Publish for members</option></select></label>
    <label className="text-sm md:col-span-2">Preview / excerpt<textarea name="excerpt" rows={3} maxLength={500} required className="field mt-2" placeholder="Short summary visible to visitors before login."/></label>
    <label className="text-sm md:col-span-2">Full research<textarea name="body_md" rows={12} required className="field mt-2" placeholder="Write your full analysis here. Members must sign in to read it."/></label>
    <label className="text-sm md:col-span-2">YouTube video URL (optional)<input name="video_url" type="url" className="field mt-2" placeholder="https://www.youtube.com/watch?v=..."/></label>
    <label className="text-sm md:col-span-2">Upload video file (optional)<input name="video_file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" className="field mt-2" onChange={e=>setVideoName(e.target.files?.[0]?.name||"")}/><span className="mt-2 block text-xs leading-5 text-slate-500">MP4, WebM, MOV or MKV · maximum 500 MB per upload. Large uploads may take time on mobile data. Uploaded files stay private and are served to signed-in members through temporary links.</span>{videoName&&<span className="mt-1 block text-xs text-cyan-300">Selected: {videoName}</span>}</label>
    {error&&<p role="alert" className="text-sm text-rose-300 md:col-span-2">{error}</p>}
    <div className="flex flex-wrap gap-3 md:col-span-2"><button disabled={busy} className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold disabled:opacity-50">{busy?"Saving research...":"Save research"}</button><Link href="/admin" className="rounded-lg border border-white/15 px-5 py-3 text-sm">Cancel</Link></div>
  </form></div></main>;
}
