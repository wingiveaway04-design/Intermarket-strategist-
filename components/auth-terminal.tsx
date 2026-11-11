"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

const inputClass =
  "mt-2 block w-full rounded-xl border border-white/10 bg-[#071321] px-4 py-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";

export default function AuthTerminal({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (isLogin && new URLSearchParams(window.location.search).get("registered") === "1") {
      setNotice("Your account is ready. Sign in with your email and password.");
    }
    if (isLogin && new URLSearchParams(window.location.search).get("password") === "updated") {
      setNotice("Your password has been updated. You can now sign in.");
    }
  }, [isLogin]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          const reason = error.message.toLowerCase();
          if (reason.includes("invalid login credentials")) {
            throw new Error("Email or password is incorrect. Check your details and try again.");
          }
          throw new Error("We couldn't sign you in right now. Please try again.");
        }

        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const destination =
          requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
            ? requestedNext
            : "/dashboard";
        window.location.assign(destination);
        return;
      }

      const cleanUsername = username.trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username: cleanUsername, display_name: cleanUsername },
        },
      });

      if (error) {
        const reason = error.message.toLowerCase();
        if (reason.includes("already registered") || reason.includes("already been registered")) {
          throw new Error("An account with this email already exists. Sign in instead.");
        }
        if (reason.includes("profiles_username_key") || reason.includes("duplicate key")) {
          throw new Error("That username is already taken. Please choose another one.");
        }
        throw new Error("We couldn't create your account. Check your details and try again.");
      }

      // Preserve the existing registration policy: creating an account does not sign the member in.
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw new Error(
            "Your account was created, but we couldn't finish the sign-out step. Please use the sign-in page."
          );
        }
      }

      window.location.assign("/login?registered=1");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-[-12rem] h-[30rem] w-[30rem] rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1727]/95 shadow-2xl shadow-black/40 lg:min-h-[680px] lg:grid-cols-[1.02fr_.98fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[.07] bg-gradient-to-br from-[#10253b] via-[#0c1a2b] to-[#10142b] p-10 lg:flex xl:p-14">
          <div aria-hidden="true" className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-cyan-200/10" />
          <div aria-hidden="true" className="absolute -right-12 top-36 h-48 w-48 rounded-full border border-cyan-200/10" />
          <div aria-hidden="true" className="absolute bottom-20 left-10 h-48 w-48 rounded-full bg-cyan-400/[.06] blur-3xl" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-sm font-black tracking-tight text-cyan-100">IS</span>
              <span className="text-xs font-bold tracking-[.2em] text-slate-200">INTERMARKET<br />STRATEGIST</span>
            </Link>
            <div className="mt-28 max-w-md">
              <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-cyan-200/80">Independent market research</p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl">
                A clearer view of the markets starts here.
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-slate-400">
                Access your research workspace, member resources and private trading journal in one place.
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-3 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]" />
            Secure member access
            <span className="mx-1 h-1 w-1 rounded-full bg-slate-700" />
            Private by design
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-9 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center justify-between lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-200/10 text-xs font-black text-cyan-100">IS</span>
                <span className="text-[11px] font-bold tracking-[.18em] text-slate-200">INTERMARKET STRATEGIST</span>
              </Link>
              <Link href="/" className="text-xs text-slate-500 hover:text-cyan-200">Home</Link>
            </div>

            <div className="mb-7">
              <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-cyan-200/75">Member access</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {isLogin ? "Welcome back." : "Create your account."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {isLogin
                  ? "Sign in to continue to your AIS workspace."
                  : "Set up your account and start building your private journal."}
              </p>
            </div>

            <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-[#071321] p-1">
              <Link
                href="/login"
                aria-current={isLogin ? "page" : undefined}
                className={`rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition ${isLogin ? "bg-[#1a3046] text-cyan-100 shadow-sm" : "text-slate-500 hover:text-slate-200"}`}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                aria-current={!isLogin ? "page" : undefined}
                className={`rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition ${!isLogin ? "bg-[#1a3046] text-cyan-100 shadow-sm" : "text-slate-500 hover:text-slate-200"}`}
              >
                Create account
              </Link>
            </div>

            {notice && (
              <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[.07] px-4 py-3 text-sm leading-6 text-emerald-200">
                {notice}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy}>
              {!isLogin && (
                <label className="block text-sm font-medium text-slate-300">
                  Username
                  <input
                    className={inputClass}
                    required
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Choose a unique username"
                  />
                  <span className="mt-1.5 block text-xs text-slate-500">3–30 characters. This is your public display name.</span>
                </label>
              )}

              <label className="block text-sm font-medium text-slate-300">
                Email address
                <input
                  className={inputClass}
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-300">
                Password
                <span className="relative mt-2 block">
                  <input
                    className={`${inputClass} pr-20`}
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={isLogin ? undefined : 8}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isLogin ? "Enter your password" : "Create a password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-3 my-auto h-9 rounded-lg px-2 text-xs font-semibold text-cyan-200/80 hover:bg-white/5 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
                {!isLogin && <span className="mt-1.5 block text-xs text-slate-500">Use at least 8 characters.</span>}
              </label>

              {isLogin && (
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs font-medium text-cyan-200/80 hover:text-cyan-100">
                    Forgot password?
                  </Link>
                </div>
              )}

              {message && (
                <p role="alert" aria-live="polite" className="rounded-xl border border-rose-300/20 bg-rose-300/[.06] px-4 py-3 text-sm leading-6 text-rose-200">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 disabled:cursor-wait disabled:opacity-65"
              >
                {busy && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
                {busy ? (isLogin ? "Signing in…" : "Creating account…") : (isLogin ? "Sign in to AIS" : "Create account")}
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-6 text-slate-500">
              {isLogin ? "New to Intermarket Strategist? " : "Already have an account? "}
              <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-cyan-200 hover:text-cyan-100">
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/[.07] pt-5 text-[11px] text-slate-600">
              <span aria-hidden="true">⌑</span>
              Secure sign-in · Your account stays yours
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
