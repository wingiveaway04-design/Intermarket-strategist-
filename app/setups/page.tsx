import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TradeImageGallery from "@/components/trade-image-gallery";
import PublicTradeActions from "@/components/public-trade-actions";

const label = (value: string) => value.replaceAll("_", " ").replace(/\\b\\w/g, (char) => char.toUpperCase());

function statusTone(status: string) {
  if (status === "all_targets_hit") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  if (status === "stopped_out") return "border-rose-300/20 bg-rose-300/10 text-rose-200";
  if (status === "in_progress") return "border-cyan-300/20 bg-cyan-300/10 text-cyan-200";
  return "border-slate-300/15 bg-slate-300/[.07] text-slate-300";
}

export default async function SetupsPage() {
  const supabase = await createClient();
  const [{ data: trades, error }, { data: { user } }] = await Promise.all([
    supabase.from("public_trades")
      .select("id,slug,instrument,market,direction,status,entry_price,stop_loss,published_at,thesis,fundamental_analysis,intermarket_analysis")
      .eq("content_state", "published")
      .order("published_at", { ascending: false })
      .limit(100),
    supabase.auth.getUser(),
  ]);

  const profile = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  const isAdmin = profile.data?.role === "admin";
  const ids = (trades ?? []).map((trade) => trade.id);

  const [{ data: images, error: imageError }, { data: targets, error: targetError }] = ids.length
    ? await Promise.all([
        supabase.from("images").select("public_trade_id,storage_path").in("public_trade_id", ids).eq("visibility", "public"),
        supabase.from("trade_targets").select("public_trade_id,target_number,price,status").in("public_trade_id", ids).order("target_number"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const loadError = error || imageError || targetError;
  const activeCount = (trades ?? []).filter((trade) => trade.status === "in_progress").length;

  return (
    <main className="min-h-screen bg-[#07111e] px-4 py-6 text-slate-100 sm:px-6 md:px-10 md:py-9">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] pb-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.08] text-sm font-bold text-cyan-200">AIS</span>
            <span><span className="block text-xs font-bold tracking-[.16em] text-slate-100">INTERMARKET STRATEGIST</span><span className="mt-0.5 block text-[10px] tracking-[.12em] text-slate-500">RESEARCH TERMINAL</span></span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs">
            <Link href="/analysis" className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/[.05] hover:text-cyan-200">Research library</Link>
            {user ? <Link href="/dashboard" className="rounded-lg border border-cyan-300/15 bg-cyan-300/[.06] px-3 py-2 text-cyan-200">AIS Terminal</Link> : <Link href="/login" className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:border-cyan-300/30">Sign in</Link>}
            {isAdmin && <Link href="/admin" className="rounded-lg px-3 py-2 text-violet-300 hover:bg-violet-300/[.07]">Admin workspace</Link>}
          </nav>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[26px] border border-cyan-200/15 bg-gradient-to-br from-[#142b43] via-[#0d1b2d] to-[#101b2b] p-6 shadow-[0_24px_70px_rgba(0,0,0,.22)] sm:p-8 md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/[.07] blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200/80">AIS Terminal · Published analyst calls</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[2.7rem]">Public trade ideas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300/80">A transparent record of published trade plans, including the fundamental thesis, intermarket context, execution levels and subsequent status updates.</p>
            </div>
            <div className="flex gap-3">
              <div className="min-w-[112px] rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-slate-400">Published</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{trades?.length ?? 0}</p>
              </div>
              <div className="min-w-[112px] rounded-2xl border border-cyan-200/15 bg-cyan-200/[.06] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-cyan-100/70">In progress</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-cyan-100">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2">
            {["Macro context", "Intermarket confluence", "Trade execution", "Outcome tracking"].map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[10px] font-medium text-slate-300">{item}</span>)}
          </div>
        </section>

        {loadError && (
          <div role="alert" className="mt-7 rounded-2xl border border-rose-400/25 bg-rose-950/25 p-5">
            <h2 className="font-semibold text-rose-200">Trade ideas could not be loaded</h2>
            <p className="mt-2 break-words text-sm text-rose-100/80">{loadError.message}</p>
            <p className="mt-2 text-xs text-slate-400">Please refresh the page. If this continues, the database permissions or query need attention.</p>
          </div>
        )}

        {!loadError && !trades?.length && (
          <section className="mt-8 rounded-2xl border border-dashed border-white/15 bg-[#0d1928] px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.07] text-2xl text-cyan-200">↗</div>
            <h2 className="mt-5 text-xl font-semibold text-white">No public trade ideas yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Official trade ideas will appear here after the administrator publishes a setup. Drafts and private journal entries are never displayed on this page.</p>
            {isAdmin && <Link href="/admin/trades/new" className="mt-6 inline-flex rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">+ Publish the first trade idea</Link>}
            {!user && <p className="mt-5 text-xs text-slate-500">New public setups will be displayed here as soon as they are published.</p>}
          </section>
        )}

        <div className="mt-7 grid gap-5">
          {trades?.map((trade) => {
            const tradeImages = (images ?? []).filter((image) => image.public_trade_id === trade.id);
            const tradeTargets = (targets ?? []).filter((target) => target.public_trade_id === trade.id);
            return (
              <PublicTradeActions tradeId={trade.id} instrument={trade.instrument} imagePaths={tradeImages.map((image) => image.storage_path)} admin={isAdmin} key={trade.id}>
                <article className="overflow-hidden rounded-[22px] border border-white/[.09] bg-gradient-to-br from-[#111f31] to-[#0c1726] shadow-[0_16px_42px_rgba(0,0,0,.16)] transition hover:border-cyan-200/20">
                  <div className="border-b border-white/[.07] p-5 sm:p-6 md:px-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-white/10 bg-white/[.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-300">{label(trade.market || "other")}</span>
                          <span className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${statusTone(trade.status)}`}>{label(trade.status)}</span>
                        </div>
                        <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{trade.instrument}</h2>
                        <p className="mt-1 text-xs text-slate-500">Published {trade.published_at ? new Date(trade.published_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "date unavailable"}</p>
                      </div>
                      <span className={trade.direction === "long" ? "rounded-full border border-emerald-300/20 bg-emerald-300/[.08] px-4 py-2 text-xs font-bold tracking-[.12em] text-emerald-200" : "rounded-full border border-rose-300/20 bg-rose-300/[.08] px-4 py-2 text-xs font-bold tracking-[.12em] text-rose-200"}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      <div className="rounded-xl border border-white/[.07] bg-black/10 p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">Entry</p><p className="mt-1 break-all text-sm font-semibold tabular-nums text-slate-100">{trade.entry_price ?? "—"}</p></div>
                      <div className="rounded-xl border border-rose-300/10 bg-rose-300/[.035] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-rose-200/60">Stop loss</p><p className="mt-1 break-all text-sm font-semibold tabular-nums text-slate-100">{trade.stop_loss ?? "—"}</p></div>
                      {tradeTargets.map((target) => <div key={target.target_number} className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.035] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-200/70">Target {target.target_number}</p><p className="mt-1 break-all text-sm font-semibold tabular-nums text-slate-100">{target.price}</p><p className="mt-1 text-[10px] text-slate-500">{label(target.status || "pending")}</p></div>)}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 md:px-7">
                    {trade.thesis && <section><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-200/75">Trade thesis</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.thesis}</p></section>}
                    {trade.fundamental_analysis && <section className="mt-5 border-t border-white/[.07] pt-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-200/75">Fundamental analysis</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.fundamental_analysis}</p></section>}
                    {trade.intermarket_analysis && <section className="mt-5 border-t border-white/[.07] pt-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-200/75">Intermarket analysis</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.intermarket_analysis}</p></section>}

                    <TradeImageGallery
                      instrument={trade.instrument}
                      images={tradeImages.map((image) => ({
                        url: supabase.storage.from("public-trade-images").getPublicUrl(image.storage_path).data.publicUrl,
                        alt: trade.instrument + " trade setup chart",
                      }))}
                    />
                  </div>
                </article>
              </PublicTradeActions>
            );
          })}
        </div>
      </div>
    </main>
  );
}
