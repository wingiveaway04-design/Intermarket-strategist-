"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
export default function DeleteNewsSetupButton({id,title}:{id:string;title:string}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function remove(){
  if(!window.confirm('Permanently delete "'+title+'"? This cannot be undone.'))return;
  setBusy(true);setError("");const supabase=createClient();
  const {data:item,error:readError}=await supabase.from("news_setups").select("cover_image_path").eq("id",id).maybeSingle();
  if(readError){setError(readError.message);setBusy(false);return;}
  const {error:deleteError}=await supabase.from("news_setups").delete().eq("id",id);
  if(deleteError){setError(deleteError.message);setBusy(false);return;}
  if(item?.cover_image_path)await supabase.storage.from("news-macro-media").remove([item.cover_image_path]);
  router.refresh();
 }
 return <div className="flex flex-col items-end gap-1"><button onClick={remove} disabled={busy} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 disabled:opacity-50">{busy?"Deleting…":"Delete"}</button>{error&&<span role="alert" className="max-w-xs text-right text-xs text-rose-300">{error}</span>}</div>;
}
