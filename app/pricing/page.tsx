import Link from "next/link";

const plans = [
  { name: "Monthly", price: "₦50,000", period: "per month", description: "Flexible access with monthly renewal.", featured: false },
  { name: "Annual", price: "₦420,000", period: "per year", description: "A full year of Premium access with 30% savings.", featured: true },
];

export default function PricingPage() {
  return <main className="min-h-screen px-5 py-12 md:px-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-xs font-semibold tracking-[.18em] text-cyan-300">INTERMARKET STRATEGIST</Link>
      <header className="mx-auto mt-12 max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Premium membership</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">Research beyond the headlines.</h1>
        <p className="mt-5 text-base leading-7 text-slate-400">Access in-depth macro research, intermarket analysis and premium video briefings designed to help you understand the forces driving global markets.</p>
      </header>
      <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
        {plans.map(plan=><article key={plan.name} className={"relative rounded-2xl border p-6 md:p-8 "+(plan.featured?"border-cyan-300/40 bg-gradient-to-br from-cyan-400/10 via-slate-900 to-violet-500/10":"border-white/10 bg-slate-900/60")}>
          {plan.featured&&<span className="inline-flex rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200">30% annual saving</span>}
          <h2 className="mt-4 text-xl font-semibold">{plan.name}</h2>
          <p className="mt-4"><span className="text-4xl font-bold tracking-tight">{plan.price}</span><span className="ml-2 text-sm text-slate-400">{plan.period}</span></p>
          <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{plan.description}</p>
          <ul className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">
            <li>Full access to premium research notes</li>
            <li>Macro and cross-market perspectives</li>
            <li>Premium research video content</li>
            <li>New analysis as it is published</li>
          </ul>
          <div className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100/80">Secure online checkout is being configured. Subscription payments are not yet enabled.</div>
        </article>)}
      </div>
      <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-5 text-slate-500">Prices shown in NGN are the current reference prices. International currency and payment options will be displayed when the global payment provider is activated. Annual pricing is calculated as 12 monthly payments less 30%.</p>
      <section className="mx-auto mt-10 max-w-4xl rounded-2xl border border-white/10 bg-slate-900/50 p-6 text-center">
        <h2 className="text-lg font-semibold">Already have an account?</h2>
        <p className="mt-2 text-sm text-slate-400">Sign in to check your Premium access, including any complimentary gift membership granted by the administrator.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/login" className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">Sign in</Link><Link href="/register" className="rounded-lg border border-white/15 px-5 py-3 text-sm">Create account</Link><Link href="/analysis" className="rounded-lg border border-white/15 px-5 py-3 text-sm">Explore research</Link></div>
      </section>
    </div>
  </main>;
}
