"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("registered") === "1") {
      setNotice("Your account has been created successfully. Please sign in with your email and password.");
    }
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const destination = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";
      window.location.assign(destination);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101a2a] p-8">
        <Link href="/" className="text-xs font-semibold tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link>
        <h1 className="mt-6 text-2xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to access your account and private trading journal.</p>
        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm text-slate-300">Email
            <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400" />
          </label>
          <label className="block text-sm text-slate-300">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400" />
          </label>
          <button disabled={busy} className="w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        {message && <p role="alert" className="mt-4 text-sm text-rose-300">{message}</p>}
        <p className="mt-6 text-sm text-slate-400">New here? <Link href="/register" className="text-blue-300 hover:text-blue-200">Create an account</Link></p>
      </section>
    </main>
  );
}
