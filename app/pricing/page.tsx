import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsdtPlanPrice } from "@/lib/crypto-payments";
import CryptoPaymentInstructions from "@/components/crypto-payment-instructions";

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
  const monthlyUsdt = getUsdtPlanPrice("monthly");
  const yearlyUsdt = getUsdtPlanPrice("yearly");
  return <main className="min-h-screen px-5 py-12 md:px-12"><div className="mx-auto max-w-5xl">
    <div className="flex items-center justify-between gap-4"><Link href="/" className="text-xs font-semibold tracking-[.18em] text-cyan-300">INTERMARKET STRATEGIST</Link><Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">My dashboard</Link></div>
    <header className="mx-auto mt-12 max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Premium membership</p><h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">Research beyond the headlines.</h1><p className="mt-5 text-base leading-7 text-slate-400">Access in-depth macro research, intermarket analysis and premium video briefings designed to help you understand the forces driving global markets.</p></header>
    {premium&&<div className="mx-auto mt-7 max-w-4xl rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-4 text-center text-sm text-emerald-200">Your account currently has Premium access. You do not need to purchase another membership.</div>}
    {searchParams.crypto && cryptoMessages[searchParams.crypto] && <p role="status" className="mx-auto mt-6 max-w-4xl rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">{cryptoMessages[searchParams.crypto]}</p>}
    <CryptoPaymentInstructions monthlyPrice={monthlyUsdt} yearlyPrice={yearlyUsdt}/>

  </div></main>;
}
