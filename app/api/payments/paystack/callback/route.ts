import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request:Request){
 const url=new URL(request.url);
 const reference=url.searchParams.get("reference")||url.searchParams.get("trxref");
 const site=process.env.NEXT_PUBLIC_SITE_URL||"https://intermarket-strategist.vercel.app";
 const secret=process.env.PAYSTACK_SECRET_KEY;
 if(!reference||!secret||!process.env.SUPABASE_SERVICE_ROLE_KEY)
   return NextResponse.redirect(new URL("/pricing?payment=verification-pending",site));
 const verify=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(reference),{headers:{Authorization:"Bearer "+secret},cache:"no-store"});
 const result=await verify.json().catch(()=>null);
 if(!verify.ok||!result?.status||result?.data?.status!=="success")
   return NextResponse.redirect(new URL("/pricing?payment=not-confirmed",site));
 const admin=createAdminClient();
 const {data:sub}=await admin.from("subscriptions").select("id,plan,amount_minor,currency").eq("paystack_reference",reference).maybeSingle();
 if(!sub||result.data.currency!==sub.currency||Number(result.data.amount)!==Number(sub.amount_minor))
   return NextResponse.redirect(new URL("/pricing?payment=verification-pending",site));
 const start=new Date();
 const end=new Date(start);
 if(sub.plan==="monthly")end.setMonth(end.getMonth()+1);else end.setFullYear(end.getFullYear()+1);
 const {error}=await admin.from("subscriptions").update({
  status:"active",current_period_start:start.toISOString(),current_period_end:end.toISOString(),
  provider_customer_code:result.data.customer?.customer_code||null,
  provider_customer_id:String(result.data.customer?.id||""),
  provider_subscription_id:result.data.subscription?.subscription_code||null,
  updated_at:start.toISOString()
 }).eq("id",sub.id);
 if(error)return NextResponse.redirect(new URL("/pricing?payment=verification-pending",site));
 return NextResponse.redirect(new URL("/dashboard?subscription=active",site));
}
