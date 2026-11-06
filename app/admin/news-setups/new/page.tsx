"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const events = ["NFP","CPI","PCE","FOMC","RETAIL_SALES","PPI","GDP","ISM_PMI","OTHER"];
const field = "field mt-2";
export default function NewNewsSetupPage() {
  const router = useRouter();
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError("");
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) { setError("Please sign in with your administrator account."); setSaving(false); return; }
    const {data:profile} = await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if (profile?.role !== "admin") { setError("Administrator access is required."); setSaving(false); return; }
    const published = form.get("publication_status") === "published";
    const rawDate = String(form.get("release_at") || "");
    const payload = {
      title: String(form.get("title") || "").trim(),
      event_type: form.get("event_type"),
      event_name: String(form.get("event_name") || "").trim(),
      release_at: rawDate ? new Date(rawDate).toISOString() : null,
      phase: form.get("phase"),
      market_focus: String(form.get("market_focus") || "").split(",").map(x=>x.trim()).filter(Boolean),
      consensus: form.get("consensus"), previous_value: form.get("previous_value"),
      macro_view: form.get("macro_view"), scenario_hot: form.get("scenario_hot"),
      scenario_cool: form.get("scenario_cool"), trade_bias: form.get("trade_bias"),
      confirmation: form.get("confirmation"), entry_plan: form.get("entry_plan"),
      invalidation: form.get("invalidation"), stop_loss: form.get("stop_loss"),
      targets: form.get("targets"), risk_note: form.get("risk_note"),
      post_event_review: form.get("post_event_review"),
      publication_status: published ? "published" : "draft",
      author_id: user.id, published_at: published ? new Date().toISOString() : null
    };
    if (!payload.title || !payload.event_name) { setError("Add a publication title and event name."); setSaving(false); return; }
    const {error:insertError} = await supabase.from("news_setups").insert(payload);
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    router.push("/admin"); router.refresh();
  }
  return <main className="min-h-screen px-5 py-10 md:px-12"><div className="mx-auto max-w-4xl">
    <Link href="/admin" className="text-xs tracking-wider text-cyan-300">← ADMIN WORKSPACE</Link>
    <p className="mt-6 text-xs uppercase tracking-[.2em] text-cyan-300">News & Macro Desk</p>
    <h1 className="mt-2 text-3xl font-semibold">News Setup Builder</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Publish a structured macro outlook, live event update, or post-event review. Separate your fundamental thesis from the confirmation required to execute.</p>
    <form onSubmit={save} className="mt-8 grid gap-5 rounded-2xl border border-white/10 bg-[#101a2a] p-5 md:grid-cols-2 md:p-7">
      <label className="text-sm md:col-span-2">Publication title<input name="title" required placeholder="US CPI — Inflation, rates and cross-market scenarios" className={field}/></label>
      <label className="text-sm">Economic event<select name="event_type" className={field}>{events.map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select></label>
      <label className="text-sm">Event name<input name="event_name" required placeholder="US CPI — October 2026" className={field}/></label>
      <label className="text-sm">Release date and time <span className="text-xs text-slate-500">(your device timezone)</span><input name="release_at" type="datetime-local" className={field}/></label>
      <label className="text-sm">Publication phase<select name="phase" className={field}><option value="pre_event_outlook">Pre-Event Outlook</option><option value="live_update">Live / Event Update</option><option value="post_event_review">Post-Event Review</option></select></label>
      <label className="text-sm md:col-span-2">Market focus <span className="text-xs text-slate-500">(comma-separated)</span><input name="market_focus" placeholder="Gold, Nasdaq, DXY, US 2Y, US 10Y" className={field}/></label>
      <label className="text-sm">Consensus / market expectation<input name="consensus" placeholder="e.g. 3.1% y/y" className={field}/></label>
      <label className="text-sm">Previous reading<input name="previous_value" placeholder="e.g. 3.0% y/y" className={field}/></label>
      <label className="text-sm md:col-span-2">Your macro view<textarea name="macro_view" rows={4} placeholder="Explain the macro thesis, policy implications and what the market has priced in." className={field}/></label>
      <label className="text-sm md:col-span-2">Scenario A — hotter / stronger data<textarea name="scenario_hot" rows={3} placeholder="Describe likely rates, DXY, yields and asset reactions if the data surprises higher." className={field}/></label>
      <label className="text-sm md:col-span-2">Scenario B — cooler / weaker data<textarea name="scenario_cool" rows={3} placeholder="Describe likely cross-market reaction if the data surprises lower." className={field}/></label>
      <label className="text-sm">Trade bias<select name="trade_bias" className={field}><option value="conditional">Conditional</option><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="neutral">Neutral</option></select></label>
      <label className="text-sm">Entry plan / trigger<input name="entry_plan" placeholder="Entry zone or price-action trigger" className={field}/></label>
      <label className="text-sm md:col-span-2">Intermarket / price confirmation<textarea name="confirmation" rows={3} placeholder="What must yields, DXY and price action confirm before execution?" className={field}/></label>
      <label className="text-sm">Invalidation condition<input name="invalidation" placeholder="What disproves the thesis?" className={field}/></label>
      <label className="text-sm">Stop loss / risk boundary<input name="stop_loss" placeholder="Price or structural invalidation" className={field}/></label>
      <label className="text-sm md:col-span-2">Targets<input name="targets" placeholder="TP1, TP2, TP3 or target zones" className={field}/></label>
      <label className="text-sm md:col-span-2">Risk note<textarea name="risk_note" rows={2} placeholder="Conditions to stand aside; event volatility and execution risks." className={field}/></label>
      <label className="text-sm md:col-span-2">Post-event review<textarea name="post_event_review" rows={3} placeholder="Complete this after the release: actual data, market reaction, thesis accuracy and lessons." className={field}/></label>
      <label className="text-sm md:col-span-2">Publication<select name="publication_status" className={field}><option value="draft">Save as draft</option><option value="published">Publish now</option></select></label>
      {error && <p role="alert" className="text-sm text-rose-300 md:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-3 md:col-span-2"><button disabled={saving} className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving?"Saving…":"Save News Setup"}</button><Link href="/admin" className="rounded-lg border border-white/15 px-5 py-3 text-sm">Cancel</Link></div>
    </form>
  </div></main>;
}
