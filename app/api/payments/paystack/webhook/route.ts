import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PaystackEvent={event?:string;data?:any};
function addPeriod(start:Date,plan:string){const end=new Date(start);if(plan==="monthly")end.setMonth(end.getMonth()+1);else end.setFullYear(end.getFullYear()+1);return end;}

export async function POST(request:Request){
 const raw=await request.text();
 const signature=request.headers.get("x-paystack-signature");
 const secret=process.env.PAYSTACK_SECRET_KEY;
 if(!signature||!secret)return NextResponse.json({error:"Unauthorized"},{status:401});
 const expected=createHmac("sha512",secret).update(raw).digest("hex");
 const a=Buffer.from(signature,"hex"),b=Buffer.from(expected,"hex");
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Invalid signature"},{status:401});
 let event:PaystackEvent;
 try{event=JSON.parse(raw) as PaystackEvent;}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!event.event||!event.data)return NextResponse.json({received:true});
 const data=event.data;
 const admin=createAdminClient();
 const ref=String(data.reference||"");
 const customerCode=String(data.customer?.customer_code||"");
 const planCode=String(data.plan?.plan_code||data.plan||"");
 const eventKey=event.event==="charge.success"?(ref||"charge-"+String(data.id)):event.event+":"+(data.subscription_code||data.subscription?.subscription_code||customerCode);
 if(eventKey){
   const {data:seen}=await admin.from("paystack_webhook_events").select("event_key").eq("event_key",eventKey).maybeSingle();
   if(seen)return NextResponse.json({received:true,duplicate:true});
 }
 if(event.event==="charge.success"&&data.status==="success"){
   let query=admin.from("subscriptions").select("id,plan,amount_minor,currency").eq("status","pending");
   if(ref)query=query.eq("paystack_reference",ref);
   let {data:subscription}=await query.maybeSingle();
   if(!subscription&&customerCode&&planCode){
     const result=await admin.from("subscriptions").select("id,plan,amount_minor,currency").eq("provider","paystack").eq("provider_customer_code",customerCode).eq("provider_plan_code",planCode).in("status",["active","past_due"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
     subscription=result.data;
   }
   if(subscription&&String(data.currency)===subscription.currency&&Number(data.amount)===Number(subscription.amount_minor)){
     const start=new Date(data.paid_at||Date.now());
     const end=addPeriod(start,subscription.plan);
     await admin.from("subscriptions").update({
       status:"active",current_period_start:start.toISOString(),current_period_end:end.toISOString(),
       provider_customer_code:customerCode||null,provider_customer_id:String(data.customer?.id||""),
       provider_subscription_id:data.subscription?.subscription_code||data.subscription_code||null,
       updated_at:new Date().toISOString()
     }).eq("id",subscription.id);
   }
 }
 if(event.event==="subscription.create"){
   const code=String(data.subscription_code||data.subscription?.subscription_code||"");
   if(customerCode&&planCode&&code){
     await admin.from("subscriptions").update({provider_subscription_id:code,provider_customer_code:customerCode,updated_at:new Date().toISOString()}).eq("provider_customer_code",customerCode).eq("provider_plan_code",planCode).eq("provider","paystack").in("status",["active","pending"]);
   }
 }
 if(event.event==="subscription.not_renew"){
   const code=String(data.subscription_code||data.subscription?.subscription_code||"");
   if(code)await admin.from("subscriptions").update({cancel_at_period_end:true,updated_at:new Date().toISOString()}).eq("provider_subscription_id",code);
 }
 if(event.event==="subscription.disable"){
   const code=String(data.subscription_code||data.subscription?.subscription_code||"");
   if(code)await admin.from("subscriptions").update({status:"expired",cancel_at_period_end:false,updated_at:new Date().toISOString()}).eq("provider_subscription_id",code);
 }
 if(event.event==="invoice.payment_failed"){
   const code=String(data.subscription?.subscription_code||data.subscription_code||"");
   if(code)await admin.from("subscriptions").update({status:"past_due",updated_at:new Date().toISOString()}).eq("provider_subscription_id",code);
 }
 if(eventKey)await admin.from("paystack_webhook_events").insert({event_key:eventKey,event_type:event.event});
 return NextResponse.json({received:true});
}
