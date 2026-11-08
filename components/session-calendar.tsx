"use client";

import {useMemo,useState} from "react";
type CalendarSession={id:string;title:string;starts_at:string|null;duration_minutes:number|null;market_focus:string[];access_level:"free"|"premium";join_url:string|null};
const monthLabel=new Intl.DateTimeFormat("en-GB",{month:"long",year:"numeric"});
const dayLabel=new Intl.DateTimeFormat("en-GB",{weekday:"short"});
const timeLabel=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit"});
function keyOf(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
export default function SessionCalendar({sessions}:{sessions:CalendarSession[]}){
 const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
 const [selected,setSelected]=useState(()=>keyOf(new Date()));
 const calendar=useMemo(()=>{
  const first=new Date(month.getFullYear(),month.getMonth(),1);
  const offset=(first.getDay()+6)%7;
  const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const cells=Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{const day=i-offset+1;return day<1||day>count?null:new Date(month.getFullYear(),month.getMonth(),day)});
  return cells;
 },[month]);
 const byDay=useMemo(()=>{const map=new Map<string,CalendarSession[]>();for(const session of sessions){if(!session.starts_at)continue;const d=new Date(session.starts_at);const k=keyOf(d);map.set(k,[...(map.get(k)||[]),session]);}return map},[sessions]);
 const selectedItems=byDay.get(selected)||[];
 const today=keyOf(new Date());
 function moveMonth(delta:number){setMonth(current=>new Date(current.getFullYear(),current.getMonth()+delta,1));}
 return <section className="mt-8 rounded-2xl border border-white/10 bg-[#101a2a] p-4 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-cyan-300">Schedule</p><h2 className="mt-1 text-xl font-semibold">Session calendar</h2></div><div className="flex items-center gap-2"><button type="button" onClick={()=>moveMonth(-1)} aria-label="Previous month" className="rounded-lg border border-white/10 px-3 py-2 text-sm">←</button><span className="min-w-32 text-center text-sm font-medium">{monthLabel.format(month)}</span><button type="button" onClick={()=>moveMonth(1)} aria-label="Next month" className="rounded-lg border border-white/10 px-3 py-2 text-sm">→</button><button type="button" onClick={()=>{const d=new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelected(keyOf(d));}} className="rounded-lg border border-cyan-300/20 px-3 py-2 text-xs text-cyan-200">Today</button></div></div>
  <div className="mt-5 grid grid-cols-7 gap-1.5">{Array.from({length:7},(_,i)=><div key={i} className="py-1 text-center text-[10px] uppercase tracking-wide text-slate-500">{dayLabel.format(new Date(2024,0,1+i))}</div>)}
   {calendar.map((date,i)=>{if(!date)return <div key={`empty-${i}`} className="min-h-14 rounded-lg bg-white/[.015] sm:min-h-20"/>;const k=keyOf(date);const events=byDay.get(k)||[];const active=selected===k;return <button type="button" key={k} onClick={()=>setSelected(k)} aria-pressed={active} className={`min-h-14 rounded-lg border p-1.5 text-left sm:min-h-20 sm:p-2 ${active?"border-cyan-300 bg-cyan-300/10":"border-white/5 bg-white/[.025] hover:border-white/20"}`}><span className={`text-xs ${k===today?"font-bold text-cyan-300":"text-slate-300"}`}>{date.getDate()}</span>{events.length>0&&<span className="mt-1 flex flex-wrap gap-1">{events.slice(0,3).map(e=><span key={e.id} className="h-1.5 w-1.5 rounded-full bg-cyan-300"/>)}{events.length>3&&<span className="text-[9px] text-slate-400">+{events.length-3}</span>}</span>}<span className="mt-1 hidden truncate text-[10px] text-slate-500 sm:block">{events.length?events.length===1?"1 session":`${events.length} sessions`:""}</span></button>})}
  </div>
  <div className="mt-5 border-t border-white/10 pt-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{new Date(selected+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</h3><span className="text-xs text-slate-500">{selectedItems.length} scheduled</span></div>
   {selectedItems.length?<div className="mt-3 space-y-2">{selectedItems.map(s=><article key={s.id} className="rounded-xl border border-white/10 bg-[#0b1625] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{s.title}</p><span className="text-xs text-cyan-200">{s.starts_at?timeLabel.format(new Date(s.starts_at)):"Time TBA"}{s.duration_minutes?` · ${s.duration_minutes} min`:""}</span></div>{s.market_focus?.length>0&&<p className="mt-1 text-xs text-slate-500">{s.market_focus.join(" · ")}</p>}<div className="mt-2 flex items-center justify-between"><span className="text-[10px] uppercase tracking-wide text-amber-200">{s.access_level==="premium"?"Premium session":"Member session"}</span>{s.join_url&&<a href={s.join_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-cyan-300">Join ↗</a>}</div></article>)}</div>:<p className="mt-3 rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">No sessions are scheduled for this date.</p>}
  </div>
 </section>
}
