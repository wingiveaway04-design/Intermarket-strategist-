import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLANS={
 monthly:{amount:5000000,code:()=>process.env.PAYSTACK_MONTHLY_PLAN_CODE},
 yearly:{amount:42000000,code:()=>process.env.PAYSTACK_YEARLY_PLAN_CODE},
} as const;

export async function POST(request:Request){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.redirect(new URL("/login?next=%2Fpricing",request.url),303);
 const form=await request.formData();
 const planName=String(form.get("plan")||"");
 if(planName!=="monthly"&&planName!=="yearly")return NextResponse.redirect(new URL("/pricing?checkout=invalid",request.url),303);
 const plan=PLANS[planName];
 const secret=process.env.PAYSTACK_SECRET_KEY;
 const planCode=plan.code();
 if(!secret||!planCode||!process.env.SUPABASE_SERVICE_ROLE_KEY)
   return NextResponse.redirect(new URL("/pricing?checkout=not-configured",request.url),303);
 const {data:premium}=await supabase.rpc("has_premium_access",{check_user_id:user.id});
 if(premium)return NextResponse.redirect(new URL("/pricing?checkout=already-premium",request.url),303);
 const admin=createAdminClient();
 const reference="IMS-"+crypto.randomUUID().replaceAll("-","");
 const site=process.env.NEXT_PUBLIC_SITE_URL||"https://intermarket-strategist.vercel.app";
 const {error:insertError}=await admin.from("subscriptions").insert({
   user_id:user.id,plan:planName,amount_minor:plan.amount,currency:"NGN",provider:"paystack",
   provider_plan_code:planCode,status:"pending",paystack_reference:reference
 });
 if(insertError)return NextResponse.redirect(new URL("/pricing?checkout=try-again",site),303);
 const response=await fetch("https://api.paystack.co/transaction/initialize",{
   method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json"},
   body:JSON.stringify({email:user.email,plan:planCode,reference,callback_url:site+"/api/payments/paystack/callback",metadata:{user_id:user.id,plan:planName,reference}})
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.status||!result?.data?.authorization_url){
   await admin.from("subscriptions").delete().eq("paystack_reference",reference).eq("status","pending");
   return NextResponse.redirect(new URL("/pricing?checkout=failed",site),303);
 }
 return NextResponse.redirect(result.data.authorization_url,303);
}
