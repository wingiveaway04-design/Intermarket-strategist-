const metrics = [
  { label: "Research focus", value: "Macro + Intermarket" },
  { label: "Official publishing", value: "Administrator only" },
  { label: "Journal privacy", value: "Owner-restricted" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080e19] text-slate-100">
      <header className="border-b border-white/10 px-6 py-5 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href="/" className="text-sm font-semibold tracking-[0.18em] text-white">INTERMARKET <span className="text-blue-400">STRATEGIST</span></a>
          <nav className="flex gap-5 text-sm text-slate-300"><a href="/analysis" className="hover:text-white">Analysis</a><a href="/setups" className="hover:text-white">Trade Setups</a><a href="/login" className="hover:text-white">Sign in</a></nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Independent market research</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">Understand the markets <span className="text-slate-400">through the intermarket lens.</span></h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">A research workspace for macroeconomic analysis, cross-market relationships, official trade ideas, and disciplined private journaling.</p>
        <div className="mt-10 flex flex-wrap gap-3"><a href="/analysis" className="rounded-md bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">Explore research</a><a href="/register" className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">Create journal</a></div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-16 md:grid-cols-3 md:px-12">
        {metrics.map((item) => <article key={item.label} className="rounded-xl border border-white/10 bg-[#101a2a] p-5"><p className="text-xs uppercase tracking-wider text-slate-500">{item.label}</p><p className="mt-3 text-lg font-medium text-slate-100">{item.value}</p></article>)}
      </section>
      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-slate-500">Market research and journal workspace · Not investment advice</footer>
    </main>
  );
}
