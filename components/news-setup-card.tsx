"use client";

import {ReactNode,useRef,useState} from "react";
import Link from "next/link";
import NewsSetupActions from "@/components/news-setup-actions";

export default function NewsSetupCard({id,title,admin,children}:{id:string;title:string;admin:boolean;children:ReactNode}){
 const [menu,setMenu]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const fired=useRef(false);
 function start(){if(!admin)return;fired.current=false;timer.current=setTimeout(()=>{fired.current=true;setMenu(true);},550);}
 function stop(){if(timer.current){clearTimeout(timer.current);timer.current=null;}}
 return <div className="relative" onContextMenu={e=>{if(admin){e.preventDefault();setMenu(true);}}} onTouchStart={start} onTouchEnd={stop} onTouchMove={stop} onTouchCancel={stop} onClickCapture={e=>{if(fired.current){e.preventDefault();e.stopPropagation();fired.current=false;}}}>
  {children}
  {admin&&menu&&<><button aria-label="Close publication actions" className="fixed inset-0 z-40 cursor-default bg-black/20" onClick={()=>setMenu(false)}/><div role="menu" className="absolute right-3 top-3 z-50 w-52 rounded-xl border border-white/15 bg-[#101a2a] p-2 shadow-2xl">
   <p className="truncate px-3 py-2 text-xs text-slate-400">{title}</p>
   <Link role="menuitem" href={"/admin/news-setups/"+id+"/edit"} className="block rounded-lg px-3 py-2.5 text-sm text-cyan-200 hover:bg-cyan-300/10">Edit publication</Link>
   <div className="px-1 pt-1" onClick={()=>setMenu(false)}><NewsSetupActions id={id} title={title}/></div>
   <p className="px-3 pt-2 text-[10px] text-slate-500">Long-press or right-click to open actions</p>
  </div></>}
 </div>;
}