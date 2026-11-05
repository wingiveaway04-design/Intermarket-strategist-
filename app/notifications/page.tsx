import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import NotificationsList from "@/components/notifications-list";
export default async function NotificationsPage(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const {data}=await supabase.from("notifications").select("id,title,body,href,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="text-sm text-cyan-300">← Dashboard</Link><h1 className="mt-5 text-3xl font-semibold">Notifications</h1><p className="mt-2 text-sm text-slate-400">Updates when new trade ideas and research are published.</p><div className="mt-7"><NotificationsList items={data||[]}/></div></div></main>}
