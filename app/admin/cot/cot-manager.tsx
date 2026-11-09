"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Report = {
  id: string; title: string; market: string; report_date: string; report_type: string; publication_status: string; access_level: string; published_at: string | null;
  managed_money_long: number | null; managed_money_short: number | null; managed_money_net: number | null;
  weekly_net_change: number | null; open_interest: number | null; summary: string | null;
  analysis_notes: string | null; source_url: string | null; created_at: string;
};

const emptyForm = {
  title: "", market: "Gold", report_date: new Date().toISOString().slice(0, 10),
  report_type: "futures_only", publication_status: "private", access_level: "premium", managed_money_long: "", managed_money_short: "",
  managed_money_net: "", weekly_net_change: "", open_interest: "", summary: "",
  analysis_notes: "", source_url: "",
};

export default function CotManager({ initialReports }: { initialReports: Report[] }) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  function update(field: keyof typeof emptyForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function edit(report: Report) {
    setEditingId(report.id);
    setForm({
      title: report.title, market: report.market, report_date: report.report_date,
      report_type: report.report_type, publication_status: report.publication_status, access_level: report.access_level, managed_money_long: report.managed_money_long?.toString() ?? "",
      managed_money_short: report.managed_money_short?.toString() ?? "",
      managed_money_net: report.managed_money_net?.toString() ?? "",
      weekly_net_change: report.weekly_net_change?.toString() ?? "",
      open_interest: report.open_interest?.toString() ?? "", summary: report.summary ?? "",
      analysis_notes: report.analysis_notes ?? "", source_url: report.source_url ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in again."); setBusy(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") { setError("Administrator access is required."); setBusy(false); return; }

    const numeric = (value: string) => value.trim() === "" ? null : Number(value);
    const payload = {
      title: form.title.trim(), market: form.market.trim(), report_date: form.report_date,
      report_type: form.report_type,
      managed_money_long: numeric(form.managed_money_long),
      managed_money_short: numeric(form.managed_money_short),
      managed_money_net: numeric(form.managed_money_net),
      weekly_net_change: numeric(form.weekly_net_change),
      open_interest: numeric(form.open_interest),
      summary: form.summary.trim() || null, analysis_notes: form.analysis_notes.trim() || null,
      source_url: form.source_url.trim() || null,
    };
    if (!payload.title || !payload.market || !payload.report_date) {
      setError("Title, market and report date are required."); setBusy(false); return;
    }
    if (payload.source_url) {
      try { const url = new URL(payload.source_url); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
      catch { setError("Enter a valid source URL."); setBusy(false); return; }
    }
    const result = editingId
      ? await supabase.from("cot_reports").update(payload).eq("id", editingId)
      : await supabase.from("cot_reports").insert({ ...payload, created_by: user.id });
    if (result.error) { setError("Could not save the COT report: " + result.error.message); setBusy(false); return; }

    const { data: refreshed, error: refreshError } = await supabase.from("cot_reports")
      .select("id,title,market,report_date,report_type,publication_status,access_level,published_at,managed_money_long,managed_money_short,managed_money_net,weekly_net_change,open_interest,summary,analysis_notes,source_url,created_at")
      .order("report_date", { ascending: false }).limit(100);
    if (refreshError) { setError("Saved, but the list could not refresh. Reload this page."); setBusy(false); router.refresh(); return; }
    setReports(refreshed ?? []);
    reset(); setBusy(false); router.refresh();
  }

  async function remove(report: Report) {
    if (!window.confirm("Permanently delete this COT report?")) return;
    const { error: deleteError } = await supabase.from("cot_reports").delete().eq("id", report.id);
    if (deleteError) { setError("Could not delete report: " + deleteError.message); return; }
    setReports(current => current.filter(item => item.id !== report.id));
    if (editingId === report.id) reset();
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="h-fit rounded-2xl border border-white/10 bg-[#101e30] p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-200/75">Weekly positioning record</p><h2 className="mt-1 text-lg font-semibold">{editingId ? "Edit COT report" : "Add COT report"}</h2></div>
          {editingId && <button type="button" onClick={reset} className="text-xs text-slate-400 hover:text-white">Cancel edit</button>}
        </div>
        <form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-300 sm:col-span-2">Report title<input required maxLength={180} value={form.title} onChange={e=>update("title",e.target.value)} className="field mt-1.5" placeholder="e.g. Gold COT positioning — week ending..." /></label>
          <label className="text-xs text-slate-300">Market<input required value={form.market} onChange={e=>update("market",e.target.value)} className="field mt-1.5" placeholder="Gold, Nasdaq 100, EUR..." /></label>
          <label className="text-xs text-slate-300">Report date<input required type="date" value={form.report_date} onChange={e=>update("report_date",e.target.value)} className="field mt-1.5" /></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Publication<select value={form.publication_status} onChange={e=>update("publication_status",e.target.value)} className="field mt-1.5"><option value="private">Keep private — administrator only</option><option value="published">Publish to members</option></select></label>\n          {form.publication_status === "published" && <label className="text-xs text-slate-300 sm:col-span-2">Who can read this report?<select value={form.access_level} onChange={e=>update("access_level",e.target.value)} className="field mt-1.5"><option value="premium">Premium members only</option><option value="free">All registered members (Free + Premium)</option></select></label>}\n          <label className="text-xs text-slate-300 sm:col-span-2">COT report type<select value={form.report_type} onChange={e=>update("report_type",e.target.value)} className="field mt-1.5"><option value="futures_only">Futures only</option><option value="futures_and_options">Futures and options combined</option></select></label>
          <label className="text-xs text-slate-300">Managed Money Long<input type="number" step="any" value={form.managed_money_long} onChange={e=>update("managed_money_long",e.target.value)} className="field mt-1.5" /></label>
          <label className="text-xs text-slate-300">Managed Money Short<input type="number" step="any" value={form.managed_money_short} onChange={e=>update("managed_money_short",e.target.value)} className="field mt-1.5" /></label>
          <label className="text-xs text-slate-300">Managed Money Net<input type="number" step="any" value={form.managed_money_net} onChange={e=>update("managed_money_net",e.target.value)} className="field mt-1.5" /></label>
          <label className="text-xs text-slate-300">Weekly net change<input type="number" step="any" value={form.weekly_net_change} onChange={e=>update("weekly_net_change",e.target.value)} className="field mt-1.5" /></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Open interest<input type="number" step="any" value={form.open_interest} onChange={e=>update("open_interest",e.target.value)} className="field mt-1.5" /></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Positioning summary<textarea rows={3} value={form.summary} onChange={e=>update("summary",e.target.value)} className="field mt-1.5" placeholder="Key weekly changes and notable positioning..." /></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Private analyst notes<textarea rows={5} value={form.analysis_notes} onChange={e=>update("analysis_notes",e.target.value)} className="field mt-1.5" placeholder="Your interpretation, historical context, extremes and potential implications..." /></label>
          <label className="text-xs text-slate-300 sm:col-span-2">Source URL (optional)<input type="url" value={form.source_url} onChange={e=>update("source_url",e.target.value)} className="field mt-1.5" placeholder="https://..." /></label>
          {error && <p role="alert" className="text-xs leading-5 text-rose-300 sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving..." : editingId ? "Save changes" : "Save COT report"}</button><button type="button" onClick={reset} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-300">Clear form</button></div>
        </form>
        <p className="mt-4 text-[10px] leading-5 text-slate-500">Choose “Keep private” to restrict a report to administrators, or “Publish to members” and select the audience. Private analyst notes remain administrator-only in either mode.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#101e30] p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-200/70">Private archive</p><h2 className="mt-1 text-lg font-semibold">Saved COT reports</h2></div><span className="rounded-full bg-white/[.06] px-2.5 py-1 text-xs text-slate-300">{reports.length}</span></div>
        {reports.length ? <div className="mt-4 divide-y divide-white/[.07]">{reports.map(report=><article key={report.id} className="py-4 first:pt-1">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-emerald-200">{report.market} · {report.report_type === "futures_and_options" ? "Futures + options" : "Futures only"}</p><h3 className="mt-1 font-semibold text-slate-100">{report.title}</h3><p className="mt-1 text-xs text-slate-500">{report.publication_status === "published" ? `Published · ${report.access_level === "free" ? "All members" : "Premium members"}` : "Private · Admin only"}</p><p className="mt-1 text-xs text-slate-500">Report date: {new Date(report.report_date + "T00:00:00").toLocaleDateString("en-NG",{dateStyle:"medium"})}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={()=>edit(report)} className="rounded-lg border border-cyan-300/25 px-3 py-1.5 text-xs text-cyan-200">Edit</button><button type="button" onClick={()=>remove(report)} className="rounded-lg border border-rose-300/25 px-3 py-1.5 text-xs text-rose-200">Delete</button></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["MM Long",report.managed_money_long],["MM Short",report.managed_money_short],["MM Net",report.managed_money_net],["Weekly Δ",report.weekly_net_change]].map(([label,value])=><div key={String(label)} className="rounded-lg bg-black/20 p-2.5"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-200">{value === null ? "—" : Number(value).toLocaleString("en-US")}</p></div>)}</div>
          {report.summary && <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-400">{report.summary}</p>}
          {report.source_url && <a href={report.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-cyan-200 underline">Open source ↗</a>}
        </article>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No COT reports saved yet. Add the first weekly report using the form.</p>}
      </section>
    </div>
  );
}
