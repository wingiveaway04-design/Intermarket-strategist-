"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign("/dashboard");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101a2a] p-8"><Link href="/" className="text-xs font-semibold tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link><h1 className="mt-6 text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm text-slate-400">Sign in to access your private trading journal.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm text-slate-300">Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400"/></label><label className="block text-sm text-slate-300">Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400"/></label><button disabled={busy} className="w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?"Signing in…":"Sign in"}</button></form>{message&&<p role="alert" className="mt-4 text-sm text-rose-300">{message}</p>}<p className="mt-6 text-sm text-slate-400">New here? <Link href="/register" className="text-blue-300 hover:text-blue-200">Create an account</Link></p><p className="mt-3 text-xs text-slate-500">Password reset flow will be connected with the configured Supabase email templates.</p></section></main>;
}
