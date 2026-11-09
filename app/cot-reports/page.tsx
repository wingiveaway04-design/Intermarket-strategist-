import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CotReportsBrowser from "./cot-reports-browser";

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

  return (
    <main className="min-h-screen bg-[#081321] px-4 py-8 text-slate-100 sm:px-6 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-cyan-300 hover:text-cyan-200">← AIS Terminal</Link>
        <header className="mt-5 rounded-2xl border border-cyan-200/15 bg-[#101e30] p-5 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200">Weekly positioning research</p>
          <h1 className="mt-2 text-3xl font-semibold">COT Reports</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Published Commitments of Traders reports and positioning summaries from the Intermarket Strategist research desk. Search the archive or filter by market and access level.</p>
        </header>
        {error ? (
          <p role="alert" className="mt-5 rounded-xl border border-rose-300/20 p-4 text-sm text-rose-200">COT reports could not be loaded. Please try again later.</p>
        ) : (
          <CotReportsBrowser reports={reports ?? []} />
        )}
      </div>
    </main>
  );
}
