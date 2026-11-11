import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-slate-100 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0b1727]/95 p-6 shadow-2xl shadow-black/40 sm:p-9">
        <Link href="/" className="text-[11px] font-bold tracking-[.2em] text-cyan-200">INTERMARKET STRATEGIST</Link>
        <p className="mt-10 text-[10px] font-semibold uppercase tracking-[.25em] text-cyan-200/70">Account recovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Password recovery is paused.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          We're completing the secure email-verification setup for password recovery. Sign-in and account creation are available, but password-reset requests are temporarily paused. Please contact the Intermarket Strategist administrator if you need help accessing your account.
        </p>
        <Link href="/login" className="mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
