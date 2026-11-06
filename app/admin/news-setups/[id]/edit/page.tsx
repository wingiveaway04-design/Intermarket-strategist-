import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import NewsSetupForm from "../../setup-form";
export default async function EditNewsSetupPage({params}:{params:{id:string}}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="admin")redirect("/dashboard");
 const {data:item}=await supabase.from("news_setups").select("*").eq("id",params.id).maybeSingle();
 if(!item)notFound();
 return <NewsSetupForm initial={item}/>;
}
