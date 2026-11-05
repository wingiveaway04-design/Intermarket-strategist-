import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });

  const form = await request.formData();
  const requestId = String(form.get("request_id") || "");
  const decision = String(form.get("decision") || "");
  const note = String(form.get("admin_note") || "").slice(0, 500);
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["approve", "reject"].includes(decision)) {
    return NextResponse.redirect(new URL("/admin/crypto-payments?result=invalid", request.url), 303);
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_review_crypto_payment", {
    p_request_id: requestId, p_approve: decision === "approve", p_admin_note: note
  });
  const result = error ? "failed" : data ? "updated" : "already-reviewed";
  return NextResponse.redirect(new URL("/admin/crypto-payments?result=" + result, request.url), 303);
}
