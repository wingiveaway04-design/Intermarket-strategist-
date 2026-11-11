import Link from "next/link";

const features = [
  ["Market research", "Read published fundamental and intermarket analysis wherever you are."],
  ["Trade ideas", "Follow official calls, direction and status updates."],
  ["Private trading journal", "Review your own trades and performance securely."],
  ["Community and messages", "Stay connected with member discussions and private conversations."],
  ["Instant notifications", "Receive relevant alerts for new research, trade updates, mentions and messages."],
];

export default function GetTheAppPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <header className="border-b border-white/[.08] bg-[#07111f]/90 px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.08] text-xs font-black text-cyan-200">AIS</span>
            <span className="text-[11px] font-bold tracking-[.16em]">INTERMARKET <span className="text-cyan-300">STRATEGIST</span></span>
          </Link>
          <Link href="/login" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:border-cyan-300/40">Sign in</Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-white/[.07]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_15%,rgba(34,211,238,.17),transparent_38%),radial-gradient(ellipse_at_10%_90%,rgba(99,102,241,.12),transparent_38%)]" />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">The mobile experience</p>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">Your market intelligence. <span className="text-cyan-300">Wherever you go.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">The Intermarket Strategist mobile app is in development for Android and iPhone. Research, trade ideas, your private journal and member conversations will come together in one native experience.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.08] px-5 py-3 text-sm font-semibold text-cyan-100"><span aria-hidden="true">◉</span> Android · Coming soon</span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-5 py-3 text-sm font-semibold text-slate-200"><span aria-hidden="true">●</span> iPhone · Coming soon</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">The download buttons will become active when signed test builds are ready. No unofficial or placeholder downloads.</p>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-[30px] border border-cyan-200/20 bg-[#0b1b2d] p-3 shadow-2xl shadow-cyan-950/30">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#071321]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><span className="text-[10px] font-bold tracking-[.16em] text-cyan-200">AIS · TERMINAL</span><span className="text-lg text-cyan-200">♧</span></div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Your workspace</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Market intelligence</h2>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {["Research desk","Trade ideas","Trading journal","Community"].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[.035] p-3"><span className="block h-1.5 w-7 rounded-full bg-cyan-300/70" /><span className="mt-3 block text-xs font-medium text-slate-200">{item}</span></div>)}
                </div>
                <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-white">Notifications</span><span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white">3 new</span></div><p className="mt-2 text-[10px] leading-5 text-slate-400">New research, community mentions and private messages in one inbox.</p></div>
                <div className="mt-4 grid grid-cols-4 gap-1 border-t border-white/10 pt-3 text-center text-[9px] text-slate-500"><span className="text-cyan-200">Home</span><span>Research</span><span>Journal</span><span>Messages</span></div>
              </div>
            </div>
            <p className="px-2 pb-1 pt-3 text-center text-[9px] tracking-[.14em] text-slate-500">MOBILE APP CONCEPT · NOT A LIVE SCREENSHOT</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Built around your workflow</p><h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Everything important, in one mobile workspace.</h2></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, description], index) => <article key={title} className="rounded-2xl border border-white/[.08] bg-[#0d1b2b] p-5"><span className="text-[10px] font-bold tracking-[.15em] text-cyan-300">0{index + 1}</span><h3 className="mt-3 text-base font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></article>)}
        </div>
      </section>

      <section className="border-t border-white/[.07] bg-[#091625] px-5 py-10 text-center">
        <h2 className="text-xl font-semibold text-white">One account across web and mobile.</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Your existing Intermarket Strategist account and membership will connect to the app. Store releases will come later, after real-device testing.</p>
        <Link href="/" className="mt-5 inline-flex rounded-xl border border-cyan-300/25 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-300/[.07]">Back to Intermarket Strategist</Link>
      </section>
    </main>
  );
}
