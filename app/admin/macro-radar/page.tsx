import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import MacroRadarManager from "./macro-radar-manager";
export default async function AdminMacroRadarPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profile?.role!=="admin")redirect("/dashboard");
 const {data:events}=await supabase.from("economic_events").select("*").order("event_at",{ascending:true}).limit(300);
 return <MacroRadarManager initialEvents={events||[]}/>;
}
