import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CotManager from "./cot-manager";

export default async function AdminCotPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: reports, error } = await supabase
    .from("cot_reports")
    .select("id,title,market,report_date,report_type,publication_status,access_level,published_at,managed_money_long,managed_money_short,managed_money_net,weekly_net_change,open_interest,summary,analysis_notes,source_url,created_at")
    .order("report_date", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-[#081321] px-4 py-8 text-slate-100 sm:px-6 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm text-cyan-300 hover:text-cyan-200">← Administrator workspace</Link>
        <header className="mt-5 rounded-2xl border border-emerald-300/15 bg-[#101e30] p-5 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-200">Administrator only · Private workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">COT Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Record and review weekly Commitments of Traders positioning for the markets you follow. These records are private to administrators and are not published to members.</p>
        </header>
        {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm text-rose-200">COT reports could not be loaded: {error.message}</p> : <CotManager initialReports={reports ?? []} />}
      </div>
    </main>
  );
}
