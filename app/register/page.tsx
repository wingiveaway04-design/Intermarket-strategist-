"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username: username.trim(), display_name: username.trim() },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }
        throw error;
      }

      // With email confirmation disabled, Supabase creates a session immediately.
      // Explicitly end that session so registration never logs the new member in.
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw new Error("Your account was created, but we couldn't safely finish sign-out. Please go to the login page and sign in.");
        }
      }

      router.replace("/login?registered=1");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101a2a] p-8">
        <Link href="/" className="text-xs font-semibold tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link>
        <h1 className="mt-6 text-2xl font-semibold">Create your journal</h1>
        <p className="mt-2 text-sm text-slate-400">Create a free account to access your private trading journal.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm text-slate-300">Username
            <input required minLength={3} maxLength={30} value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400" />
          </label>
          <label className="block text-sm text-slate-300">Email
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400" />
          </label>
          <label className="block text-sm text-slate-300">Password
            <input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400" />
            <span className="mt-1 block text-xs text-slate-500">Use at least 8 characters.</span>
          </label>
          <button disabled={busy} className="w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Creating account…" : "Create account"}</button>
        </form>
        {message && <p role="alert" className="mt-4 break-words text-sm text-rose-300">{message}</p>}
        <p className="mt-6 text-sm text-slate-400">Already registered? <Link href="/login" className="text-blue-300 hover:text-blue-200">Sign in</Link></p>
      </section>
    </main>
  );
}
