"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

export default function NewsSetupActions({id,title}:{id:string;title:string}){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function remove(){
  setBusy(true);setError("");
  const supabase=createClient();
  const {data:item,error:readError}=await supabase.from("news_setups").select("cover_image_path,image_paths").eq("id",id).maybeSingle();
  if(readError){setError(readError.message);setBusy(false);return;}
  const {error:deleteError}=await supabase.from("news_setups").delete().eq("id",id);
  if(deleteError){setError(deleteError.message);setBusy(false);return;}
  const mediaPaths=[...new Set([...(item?.image_paths||[]),...(item?.cover_image_path?[item.cover_image_path]:[])])];
  if(mediaPaths.length){
   const {error:mediaError}=await supabase.storage.from("news-macro-media").remove(mediaPaths);
   if(mediaError){setError("Publication deleted, but its cover image could not be removed: "+mediaError.message);setBusy(false);router.refresh();return;}
  }
  setOpen(false);setBusy(false);router.refresh();
 }
 return <>
  <div className="flex items-center gap-2">
   <Link href={"/admin/news-setups/"+id+"/edit"} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/10">Edit publication</Link>
   <button type="button" onClick={()=>{setError("");setOpen(true)}} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10">Delete</button>
  </div>
  {open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setOpen(false)}}>
   <section role="dialog" aria-modal="true" aria-labelledby={"delete-title-"+id} className="w-full max-w-md rounded-2xl border border-rose-300/20 bg-[#111c2d] p-6 shadow-2xl">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-400/10 text-xl text-rose-300">!</div>
    <h2 id={"delete-title-"+id} className="mt-4 text-lg font-semibold text-white">Delete this publication?</h2>
    <p className="mt-2 text-sm leading-6 text-slate-300">You are about to permanently delete <strong className="text-white">{title}</strong>. Its News & Macro entry and associated cover image will be removed. This action cannot be undone.</p>
    {error&&<p role="alert" className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200">{error}</p>}
    <div className="mt-6 flex justify-end gap-3">
     <button type="button" disabled={busy} onClick={()=>setOpen(false)} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-200 disabled:opacity-50">Cancel</button>
     <button type="button" disabled={busy} onClick={remove} className="rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?"Deleting…":"Confirm delete"}</button>
    </div>
   </section>
  </div>}
 </>;
}
