import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import PremiumBadge from "@/components/premium-badge";
import PremiumLoungeChat from "@/components/premium-lounge-chat";
import PremiumDirectMessages from "@/components/premium-direct-messages";
export default async function PremiumLoungePage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
 const isAdmin=profile?.role==="admin"; const {data:premium}=await supabase.rpc("has_premium_access",{check_user_id:user.id}); if(!premium&&!isAdmin)redirect("/pricing");
 const {data:rows}=await supabase.from("premium_chat_messages").select("id,user_id,message_type,body,media_path,media_type,file_name,reply_to_id,mentioned_user_ids,is_pinned,pinned_at,created_at,edited_at").order("created_at",{ascending:false}).limit(150);
 const {data:profiles}=await supabase.from("profiles").select("id,username,display_name,avatar_path,role").order("username");
 const {data:conversations}=await supabase.from("premium_direct_conversations").select("id,member_id,admin_id,created_at").order("updated_at",{ascending:false});
 const premiumMembers=isAdmin?await Promise.all((profiles||[]).filter(p=>p.role!=="admin").map(async p=>{const {data}=await supabase.rpc("has_premium_access",{check_user_id:p.id});return data?p:null;})):[];
 const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
 const messages=await Promise.all([...(rows||[])].reverse().map(async m=>{let media_url:string|null=null;if(m.media_path){const {data}=await supabase.storage.from("premium-lounge").createSignedUrl(m.media_path,3600);media_url=data?.signedUrl||null;}const parent=(rows||[]).find(p=>p.id===m.reply_to_id);return {...m,media_url,profiles:profileMap.get(m.user_id)||null,reply_preview:parent?{body:parent.body,message_type:parent.message_type,username:profileMap.get(parent.user_id)?.username||"member"}:null};}));
 return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="text-sm text-cyan-300">← Dashboard</Link><header className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-3"><h1 className="text-3xl font-semibold">Premium Lounge</h1><PremiumBadge/></div><p className="mt-2 text-sm text-slate-400">A private analyst–member room for market discussion, chart sharing and voice briefings.</p></div><span className="rounded-full border border-emerald-300/20 px-3 py-2 text-xs text-emerald-200">Members-only access</span></header><PremiumLoungeChat initialMessages={messages} userId={user.id} isAdmin={isAdmin} members={(profiles||[]).map(p=>({id:p.id,username:p.username,display_name:p.display_name,role:p.role}))}/><PremiumDirectMessages userId={user.id} isAdmin={isAdmin} members={premiumMembers.filter(Boolean).map(p=>({id:p!.id,username:p!.username,display_name:p!.display_name,role:p!.role}))} initialConversations={conversations||[]}/></div></main>;
}
