import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsdtPlanPrice, isValidTronTxHash, USDT_TRC20_WALLET } from "@/lib/crypto-payments";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=%2Fpricing", request.url), 303);

  const form = await request.formData();
  const plan = String(form.get("plan") || "");
  const txHash = String(form.get("tx_hash") || "").trim();
  if (plan !== "monthly" && plan !== "yearly") return NextResponse.redirect(new URL("/pricing?crypto=invalid-plan", request.url), 303);
  const amount = getUsdtPlanPrice(plan);
  if (!amount) return NextResponse.redirect(new URL("/pricing?crypto=not-configured", request.url), 303);
  if (!isValidTronTxHash(txHash)) return NextResponse.redirect(new URL("/pricing?crypto=invalid-hash", request.url), 303);

  const { data: premium } = await supabase.rpc("has_premium_access", { check_user_id: user.id });
  if (premium) return NextResponse.redirect(new URL("/pricing?crypto=already-premium", request.url), 303);

  const admin = createAdminClient();
  const { error } = await admin.from("crypto_payment_requests").insert({
    user_id: user.id, plan, amount_usdt: amount, wallet_address: USDT_TRC20_WALLET,
    network: "TRC20", tx_hash: txHash, status: "pending"
  });
  if (error) {
    const code = error.code === "23505" ? "duplicate-hash" : "submit-failed";
    return NextResponse.redirect(new URL("/pricing?crypto=" + code, request.url), 303);
  }
  return NextResponse.redirect(new URL("/pricing?crypto=submitted", request.url), 303);
}
