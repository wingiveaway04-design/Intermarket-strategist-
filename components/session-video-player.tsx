"use client";

type Props={url:string;title:string};
function getPlayer(url:string){
 try{
  const parsed=new URL(url);
  const host=parsed.hostname.toLowerCase().replace(/^www\./,"");
  if(host==="youtube.com"||host==="m.youtube.com"||host==="youtube-nocookie.com"){
   const id=parsed.pathname==="/watch"?parsed.searchParams.get("v"):parsed.pathname.split("/").filter(Boolean).slice(-1)[0];
   if(id&&/^[\w-]{11}$/.test(id))return {kind:"embed" as const,src:`https://www.youtube-nocookie.com/embed/${id}`};
  }
  if(host==="youtu.be"){
   const id=parsed.pathname.split("/").filter(Boolean)[0];
   if(id&&/^[\w-]{11}$/.test(id))return {kind:"embed" as const,src:`https://www.youtube-nocookie.com/embed/${id}`};
  }
  if(host==="vimeo.com"||host==="player.vimeo.com"){
   const id=parsed.pathname.split("/").filter(Boolean).find(x=>/^\d+$/.test(x));
   if(id)return {kind:"embed" as const,src:`https://player.vimeo.com/video/${id}`};
  }
  if(/\.(mp4|webm|mov|m4v)$/i.test(parsed.pathname))return {kind:"video" as const,src:parsed.href};
  return {kind:"link" as const,src:parsed.href};
 }catch{return {kind:"link" as const,src:url}}
}
export default function SessionVideoPlayer({url,title}:Props){
 const player=getPlayer(url);
 if(player.kind==="video")return <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black"><video className="aspect-video w-full" controls preload="metadata" playsInline src={player.src}>Your browser does not support embedded video playback.</video></div>;
 if(player.kind==="embed")return <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black"><iframe className="h-full w-full" src={player.src} title={title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>;
 return <a href={player.src} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-lg bg-violet-300 px-4 py-2.5 text-sm font-semibold text-slate-950">Open recording ↗</a>;
}
