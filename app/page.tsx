import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const metrics = [
  { label: "Research focus", value: "Macro + Intermarket", accent: "from-cyan-400/20 to-blue-500/5", dot: "bg-cyan-300" },
  { label: "Official publishing", value: "Administrator only", accent: "from-violet-400/20 to-fuchsia-500/5", dot: "bg-violet-300" },
  { label: "Journal privacy", value: "Owner-restricted", accent: "from-emerald-400/20 to-teal-500/5", dot: "bg-emerald-300" },
];

export default async function HomePage() {\n  const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/35 px-6 py-5 backdrop-blur-xl md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href="/" className="text-sm font-bold tracking-[0.18em] text-white">INTERMARKET <span className="text-cyan-300">STRATEGIST</span></a>
          <nav className="flex flex-wrap gap-4 text-sm text-slate-300 sm:gap-5"><Link href="/analysis" className="hover:text-cyan-200">Analysis</Link><Link href="/setups" className="hover:text-cyan-200">Trade Setups</Link>{user ? <Link href="/dashboard" className="hover:text-cyan-200">Dashboard</Link> : <Link href="/login" className="hover:text-cyan-200">Sign in</Link>}{profile?.role === "admin" && <Link href="/admin" className="hover:text-violet-200">Admin</Link>}</nav>
        </div>
      </header>
      <section className="relative mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Independent market research</p>
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">Understand the markets <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">through the intermarket lens.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">A research workspace for macroeconomic analysis, cross-market relationships, official trade ideas, and disciplined private journaling.</p>
          <div className="mt-10 flex flex-wrap gap-3"><Link href="/analysis" className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 hover:from-cyan-400 hover:to-blue-500">Explore research ↗</Link><Link href={user ? "/dashboard" : "/register"} className="rounded-lg border border-violet-300/25 bg-violet-400/5 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-violet-400/10">{user ? "Open dashboard" : "Create journal"}</Link></div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-20 md:grid-cols-3 md:px-12">
        {metrics.map((item) => <article key={item.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${item.accent} bg-slate-900/70 p-5 shadow-xl shadow-black/10 backdrop-blur`}><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.dot}`} /><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p></div><p className="mt-4 text-xl font-semibold text-slate-100">{item.value}</p></article>)}
      </section>
      <footer className="border-t border-white/10 bg-slate-950/30 px-6 py-6 text-center text-xs text-slate-500">Market research and journal workspace · Not investment advice</footer>
    </main>
  );
}
