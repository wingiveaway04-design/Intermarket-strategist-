import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CotReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reports, error } = await supabase
    .from("cot_reports")
    .select("id,title,market,report_date,report_type,managed_money_long,managed_money_short,managed_money_net,weekly_net_change,open_interest,summary,source_url,published_at,access_level")
    .eq("publication_status", "published")
    .order("report_date", { ascending: false })
    .limit(100);

  return <main className="min-h-screen bg-[#081321] px-4 py-8 text-slate-100 sm:px-6 md:px-10">
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard" className="text-sm text-cyan-300 hover:text-cyan-200">← AIS Terminal</Link>
      <header className="mt-5 rounded-2xl border border-cyan-200/15 bg-[#101e30] p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200">Weekly positioning research</p>
        <h1 className="mt-2 text-3xl font-semibold">COT Reports</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Published Commitments of Traders reports and positioning summaries from the Intermarket Strategist research desk.</p>
      </header>
      {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-300/20 p-4 text-sm text-rose-200">COT reports could not be loaded. Please try again later.</p> : reports?.length ? <div className="mt-6 grid gap-4">{reports.map(report=><article key={report.id} className="rounded-2xl border border-white/10 bg-[#101e30] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">{report.market} · {report.report_type === "futures_and_options" ? "Futures + options" : "Futures only"}</p><h2 className="mt-2 text-xl font-semibold">{report.title}</h2><p className="mt-1 text-xs text-slate-500">Report date: {new Date(report.report_date + "T00:00:00").toLocaleDateString("en-NG",{dateStyle:"long"})}</p></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1 text-[10px] text-emerald-200">{report.access_level === "free" ? "Member research" : "Premium research"}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Managed Money Long",report.managed_money_long],["Managed Money Short",report.managed_money_short],["Managed Money Net",report.managed_money_net],["Weekly net change",report.weekly_net_change],["Open interest",report.open_interest]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-black/20 p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-100">{value === null ? "—" : Number(value).toLocaleString("en-US")}</p></div>)}</div>
        {report.summary && <div className="mt-5"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Positioning overview</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{report.summary}</p></div>}
        {report.source_url && <a href={report.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-cyan-200 underline">View original source ↗</a>}
      </article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-[#101e30] p-8 text-center"><h2 className="font-semibold text-slate-200">No COT reports published yet</h2><p className="mt-2 text-sm text-slate-500">When the research desk publishes a weekly report for your membership level, it will appear here.</p></div>}
    </div>
  </main>;
}
