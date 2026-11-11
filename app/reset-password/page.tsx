"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "mt-2 block w-full rounded-xl border border-white/10 bg-[#071321] px-4 py-3.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    createClient().auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setValidSession(!error && Boolean(data.session));
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      setValidSession(false);
      setChecking(false);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    if (password.length < 8) {
      setMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirm) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw new Error("The password could not be updated. Request a fresh reset link and try again.");
      window.location.assign("/login?password=updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-slate-100 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0b1727]/95 p-6 shadow-2xl shadow-black/40 sm:p-9">
        <Link href="/" className="text-[11px] font-bold tracking-[.2em] text-cyan-200">INTERMARKET STRATEGIST</Link>
        <p className="mt-10 text-[10px] font-semibold uppercase tracking-[.25em] text-cyan-200/70">Account recovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose a new password.</h1>
        {checking ? (
          <p role="status" className="mt-6 text-sm text-slate-400">Verifying your secure reset session…</p>
        ) : !validSession ? (
          <div className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-200/[.05] p-5">
            <p className="text-sm leading-6 text-amber-100">This reset link is invalid or has expired. Request a new link to continue.</p>
            <Link href="/forgot-password" className="mt-4 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white">Request a new link</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={busy}>
            <label className="block text-sm font-medium text-slate-300">
              New password
              <span className="relative mt-2 block">
                <input className={`${inputClass} pr-20`} required minLength={8} type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 my-auto h-9 rounded-lg px-2 text-xs font-semibold text-cyan-200/80 hover:bg-white/5">{showPassword ? "Hide" : "Show"}</button>
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Confirm new password
              <input className={inputClass} required minLength={8} type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Enter it again" />
            </label>
            {message && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.06] px-4 py-3 text-sm text-rose-200">{message}</p>}
            <button disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Updating password…" : "Update password"}</button>
          </form>
        )}
        <p className="mt-7 text-center text-sm text-slate-500"><Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">Back to sign in</Link></p>
      </section>
    </main>
  );
}
