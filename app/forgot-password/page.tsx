"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "mt-2 block w-full rounded-xl border border-white/10 bg-[#071321] px-4 py-3.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw new Error("We couldn't send the reset email right now. Please try again later.");
      // Keep the response identical whether or not the address belongs to an account.
      setSent(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to request a password reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-slate-100 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0b1727]/95 p-6 shadow-2xl shadow-black/40 sm:p-9">
        <Link href="/" className="text-[11px] font-bold tracking-[.2em] text-cyan-200">INTERMARKET STRATEGIST</Link>
        <p className="mt-10 text-[10px] font-semibold uppercase tracking-[.25em] text-cyan-200/70">Account recovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Reset your password.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Enter the email address linked to your AIS account. We'll send a secure password reset link if an account matches.</p>

        {sent ? (
          <div role="status" className="mt-7 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] p-5">
            <p className="font-semibold text-emerald-200">Check your inbox</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">If an account exists for {email.trim()}, a password reset link will be sent. You can return here and sign in after updating your password.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={busy}>
            <label className="block text-sm font-medium text-slate-300">
              Email address
              <input className={inputClass} required type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            {message && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.06] px-4 py-3 text-sm text-rose-200">{message}</p>}
            <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
              {busy ? "Sending reset link…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-sm text-slate-500"><Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">Back to sign in</Link></p>
      </section>
    </main>
  );
}
