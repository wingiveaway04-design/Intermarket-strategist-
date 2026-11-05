import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCryptoPaymentsPage({ searchParams }: { searchParams: { result?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");
  const { data: payments, error } = await supabase.from("crypto_payment_requests")
    .select("id,user_id,plan,amount_usdt,wallet_address,network,tx_hash,status,created_at,admin_note")
    .order("created_at", { ascending: false }).limit(100);
  return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm text-cyan-300">← Administrator workspace</Link>
    <header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Manual crypto settlement</p><h1 className="mt-2 text-3xl font-bold">USDT TRC20 payment reviews</h1><p className="mt-2 text-sm text-slate-400">Verify every transaction independently on a TRON explorer before approving. Approval activates the selected Premium period.</p></header>
    {searchParams.result && <p className="mt-5 rounded-lg border border-white/10 p-3 text-sm text-slate-300">Review result: {searchParams.result.replaceAll("-", " ")}</p>}
    {error && <p className="mt-5 text-sm text-rose-300">Could not load payment requests: {error.message}</p>}
    <section className="mt-7 space-y-4">{!payments?.length ? <p className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">No crypto payment submissions yet.</p> : payments.map((p) => <article key={p.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{p.amount_usdt} USDT · {p.plan}</h2><p className="mt-1 text-xs text-slate-400">Member ID: {p.user_id} · {new Date(p.created_at).toLocaleString()}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{p.status}</span></div>
      <p className="mt-4 break-all text-sm"><span className="text-slate-500">Transaction hash: </span>{p.tx_hash}</p>
      <p className="mt-2 break-all text-xs text-slate-500">Receiving wallet: {p.wallet_address}</p>
      {p.admin_note && <p className="mt-2 text-sm text-slate-400">Admin note: {p.admin_note}</p>}
      {p.status === "pending" && <form action="/api/admin/crypto-payments/review" method="post" className="mt-4 flex flex-wrap items-center gap-2"><input type="hidden" name="request_id" value={p.id}/><input name="admin_note" maxLength={500} placeholder="Optional admin note" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"/><button name="decision" value="approve" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Approve after verification</button><button name="decision" value="reject" className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm text-rose-300">Reject</button></form>}
    </article>)}</section>
  </div></main>;
}
