"use client";

import {useState} from "react";

export default function NewsImageGallery({images,title}:{images:string[];title:string}){
 const [active,setActive]=useState<number|null>(null);
 if(!images.length)return null;
 const move=(step:number)=>setActive(current=>current===null?null:(current+step+images.length)%images.length);
 return <>
  <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4">
   {images.map((src,i)=><button key={src} type="button" onClick={()=>setActive(i)} className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left" aria-label={`View image ${i+1} of ${images.length}`}>
    <img src={src} alt={title+` — image ${i+1}`} className="h-36 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-44"/>
    <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-1 text-[10px] text-white">View full image</span>
   </button>)}
  </div>
  {active!==null&&<div role="dialog" aria-modal="true" aria-label="Image gallery viewer" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-8" onClick={()=>setActive(null)}>
   <button type="button" onClick={()=>setActive(null)} className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm text-white">Close ✕</button>
   {images.length>1&&<button type="button" aria-label="Previous image" onClick={e=>{e.stopPropagation();move(-1)}} className="absolute left-3 z-10 rounded-full bg-white/10 px-4 py-3 text-2xl text-white sm:left-6">‹</button>}
   <img src={images[active]} alt={title+` — image ${active+1}`} onClick={e=>e.stopPropagation()} className="max-h-[88vh] max-w-[92vw] object-contain"/>
   {images.length>1&&<button type="button" aria-label="Next image" onClick={e=>{e.stopPropagation();move(1)}} className="absolute right-3 z-10 rounded-full bg-white/10 px-4 py-3 text-2xl text-white sm:right-6">›</button>}
   <span className="absolute bottom-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white">{active+1} / {images.length}</span>
  </div>}
 </>;
}