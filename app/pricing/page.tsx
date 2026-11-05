import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsdtPlanPrice } from "@/lib/crypto-payments";
import CryptoPaymentInstructions from "@/components/crypto-payment-instructions";

const plans = [
  { name: "Monthly", price: "₦50,000", period: "per month", description: "Flexible access with monthly renewal.", featured: false },
  { name: "Annual", price: "₦420,000", period: "per year", description: "A full year of Premium access with 30% savings.", featured: true },
];

const cryptoMessages: Record<string, string> = {
  submitted: "Your transaction hash has been submitted. Premium access remains pending until an administrator verifies the transfer.",
  "invalid-hash": "That transaction hash format is invalid. Enter the 64-character transaction ID from your TRON transfer.",
  "duplicate-hash": "This transaction hash has already been submitted.",
  "submit-failed": "We could not save your payment submission. Please try again or contact support.",
  "already-premium": "Your account already has Premium access.",
  "not-configured": "USDT payment prices have not been configured yet.",
};

export default async function PricingPage({ searchParams }: { searchParams: { crypto?: string } }) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login?next=%2Fpricing");
  const {data:premium}=await supabase.rpc("has_premium_access",{check_user_id:user.id});
  const checkoutReady=Boolean(process.env.PAYSTACK_SECRET_KEY&&process.env.PAYSTACK_MONTHLY_PLAN_CODE&&process.env.PAYSTACK_YEARLY_PLAN_CODE&&process.env.SUPABASE_SERVICE_ROLE_KEY);
  const monthlyUsdt = getUsdtPlanPrice("monthly");
  const yearlyUsdt = getUsdtPlanPrice("yearly");
  return <main className="min-h-screen px-5 py-12 md:px-12"><div className="mx-auto max-w-5xl">
    <div className="flex items-center justify-between gap-4"><Link href="/" className="text-xs font-semibold tracking-[.18em] text-cyan-300">INTERMARKET STRATEGIST</Link><Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">My dashboard</Link></div>
    <header className="mx-auto mt-12 max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Premium membership</p><h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">Research beyond the headlines.</h1><p className="mt-5 text-base leading-7 text-slate-400">Access in-depth macro research, intermarket analysis and premium video briefings designed to help you understand the forces driving global markets.</p></header>
    {premium&&<div className="mx-auto mt-7 max-w-4xl rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-4 text-center text-sm text-emerald-200">Your account currently has Premium access. You do not need to purchase another membership.</div>}
    {searchParams.crypto && cryptoMessages[searchParams.crypto] && <p role="status" className="mx-auto mt-6 max-w-4xl rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">{cryptoMessages[searchParams.crypto]}</p>}
    <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">{plans.map(plan=><article key={plan.name} className={"relative rounded-2xl border p-6 md:p-8 "+(plan.featured?"border-cyan-300/40 bg-gradient-to-br from-cyan-400/10 via-slate-900 to-violet-500/10":"border-white/10 bg-slate-900/60")}>
      {plan.featured&&<span className="inline-flex rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200">30% annual saving</span>}<h2 className="mt-4 text-xl font-semibold">{plan.name}</h2><p className="mt-4"><span className="text-4xl font-bold tracking-tight">{plan.price}</span><span className="ml-2 text-sm text-slate-400">{plan.period}</span></p><p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{plan.description}</p>
      <ul className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300"><li>Full access to premium research notes</li><li>Macro and cross-market perspectives</li><li>Premium research video content</li><li>New analysis as it is published</li></ul>
      <form action="/api/payments/paystack/checkout" method="post" className="mt-7"><input type="hidden" name="plan" value={plan.name==="Monthly"?"monthly":"yearly"}/><button disabled={Boolean(premium)||!checkoutReady} className="w-full rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{premium?"Premium access active":checkoutReady?"Continue to secure checkout":"Paystack checkout activation in progress"}</button></form>
    </article>)}</div>
    <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-5 text-slate-500">Prices are currently shown in Nigerian naira. International currency and card acceptance depend on payment-provider approval and availability. Annual pricing is 12 monthly payments less 30%.</p>
    {!checkoutReady&&<p className="mx-auto mt-3 max-w-3xl text-center text-xs leading-5 text-amber-200/80">Secure Paystack checkout is being configured. Payment will become available after merchant approval and secure credentials are installed.</p>}
    <CryptoPaymentInstructions monthlyPrice={monthlyUsdt} yearlyPrice={yearlyUsdt}/>
  </div></main>;
}
