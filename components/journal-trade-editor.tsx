"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Trade = {
  id: string;
  instrument: string;
  status: string;
  realized_r: number | string | null;
  news_trade_attribution: string;
  news_event_type: string | null;
  news_event_name: string | null;
  news_event_at: string | null;
};

const eventTypes = ["NFP","CPI","Core CPI","PCE","Core PCE","FOMC Rate Decision","FOMC Press Conference","FOMC Minutes","GDP","Retail Sales","PPI","ISM PMI","Employment Data","Central Bank Decision","Other"];
const completedStatuses = ["all_targets_hit","stopped_out","breakeven","closed_manually"];

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}

export default function JournalTradeEditor({ trade }: { trade: Trade }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    const attribution = String(form.get("news_trade_attribution"));
    const eventType = String(form.get("news_event_type") || "").trim();
    const eventName = String(form.get("news_event_name") || "").trim();
    const rawR = String(form.get("realized_r") || "").trim();
    const isCompleted = completedStatuses.includes(status);
    const realizedR = rawR === "" ? null : Number(rawR);

    if (attribution === "direct_news" && (!eventType || !eventName)) {
      setError("Select the news event type and enter its specific release name.");
      setSaving(false);
      return;
    }
    if (isCompleted && (realizedR === null || !Number.isFinite(realizedR))) {
      setError("Enter the final realized R for a completed trade. Use 0 for breakeven.");
      setSaving(false);
      return;
    }

    const eventAt = String(form.get("news_event_at") || "");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.from("private_trades").update({
      status,
      news_trade_attribution: attribution,
      news_event_type: attribution === "direct_news" ? eventType : null,
      news_event_name: attribution === "direct_news" ? eventName : null,
      news_event_at: attribution === "direct_news" && eventAt ? new Date(eventAt).toISOString() : null,
      realized_r: isCompleted ? realizedR : null,
      closed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", trade.id).eq("owner_id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    router.push("/journal/" + trade.id);
    router.refresh();
  }

  return <main className="min-h-screen px-5 py-8 text-slate-100 md:px-10">
    <div className="mx-auto max-w-3xl">
      <Link href={"/journal/" + trade.id} className="text-xs font-semibold text-cyan-200">← BACK TO TRADE</Link>
      <header className="mt-6"><p className="text-xs uppercase tracking-[.18em] text-cyan-300">Private journal management</p><h1 className="mt-2 text-3xl font-semibold">Update {trade.instrument}</h1><p className="mt-2 text-sm text-slate-400">Update its outcome and news classification. These records remain private to your account.</p></header>
      <form onSubmit={save} className="mt-7 grid gap-4 rounded-2xl border border-white/10 bg-[#101a2a] p-5 sm:grid-cols-2">
        <label className="text-sm">Trade status<select name="status" defaultValue={trade.status} className="field mt-2"><option value="in_progress">In progress</option><option value="all_targets_hit">All targets hit</option><option value="stopped_out">Stopped out</option><option value="breakeven">Breakeven</option><option value="closed_manually">Closed manually</option><option value="cancelled">Cancelled</option></select></label>
        <label className="text-sm">Final realized result (R)<input name="realized_r" type="number" step="0.01" defaultValue={trade.realized_r ?? ""} placeholder="e.g. 2, -1 or 0" className="field mt-2"/><span className="mt-1 block text-xs text-slate-500">Use the combined final result after partial exits and trading costs. Required when completed.</span></label>
        <section className="sm:col-span-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-4">
          <h2 className="text-sm font-semibold text-cyan-200">News-trade classification</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Only direct trades taken because of a release count toward the Barometer. Trades merely open during an event are kept separate.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Relationship to news<select name="news_trade_attribution" defaultValue={trade.news_trade_attribution || "not_news"} className="field mt-2"><option value="not_news">Not a news trade</option><option value="direct_news">Direct news trade — include in Barometer</option><option value="event_context">Market context only — exclude from Barometer</option></select></label>
            <label className="text-sm">Economic event<select name="news_event_type" defaultValue={trade.news_event_type || ""} className="field mt-2"><option value="">Select event type</option>{eventTypes.map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
            <label className="text-sm">Specific release name<input name="news_event_name" defaultValue={trade.news_event_name || ""} placeholder="e.g. US October 2026 NFP" className="field mt-2"/></label>
            <label className="text-sm">Release date and time<input name="news_event_at" type="datetime-local" defaultValue={localDateTime(trade.news_event_at)} className="field mt-2"/></label>
          </div>
        </section>
        {error && <p role="alert" className="text-sm text-rose-300 sm:col-span-2">{error}</p>}
        <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={saving} className="rounded-lg bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? "Saving..." : "Save trade update"}</button><Link href={"/journal/" + trade.id} className="rounded-lg border border-white/15 px-5 py-3 text-sm">Cancel</Link></div>
      </form>
    </div>
  </main>;
}
