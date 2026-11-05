"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
export default function NotificationBell(){const [count,setCount]=useState(0);
 useEffect(()=>{const supabase=createClient();let alive=true;async function load(){const {count}=await supabase.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null);if(alive)setCount(count||0);}void load();const channel=supabase.channel("notification-bell").on("postgres_changes",{event:"*",schema:"public",table:"notifications"},()=>void load()).subscribe();return()=>{alive=false;void supabase.removeChannel(channel);};},[]);
 return <Link href="/notifications" aria-label={count?count+" unread notifications":"Notifications"} className="relative inline-flex items-center rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5"><span aria-hidden="true">🔔</span>{count>0&&<span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{count>99?"99+":count}</span>}<span className="ml-2">Notifications</span></Link>;
}
