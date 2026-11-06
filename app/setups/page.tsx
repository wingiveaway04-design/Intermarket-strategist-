import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TradeImageGallery from "@/components/trade-image-gallery";
import PublicTradeActions from "@/components/public-trade-actions";

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

  return (
    <main className="min-h-screen bg-[#080e19] px-5 py-10 text-slate-100 md:px-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-xs tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link>
        <header className="flex flex-wrap items-center justify-between gap-4"><nav className="flex flex-wrap gap-3 text-sm"><Link href="/analysis" className="text-slate-300 hover:text-cyan-200">Research library</Link>{user ? <Link href="/dashboard" className="text-slate-300 hover:text-cyan-200">Dashboard</Link> : <Link href="/login" className="text-slate-300 hover:text-cyan-200">Sign in</Link>}{isAdmin && <Link href="/admin" className="text-violet-300">Admin workspace</Link>}</nav></header>\n        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-blue-300">Administrator-published research</p>
            <h1 className="mt-3 text-4xl font-semibold">Public trade ideas</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Trade plans, macro rationale and intermarket confluence behind each official setup.</p>
          </div>
          <Link href="/" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Home</Link>
        </div>

        {loadError && (
          <div role="alert" className="mt-8 rounded-xl border border-rose-400/30 bg-rose-950/30 p-5">
            <h2 className="font-semibold text-rose-200">Trade ideas could not be loaded</h2>
            <p className="mt-2 break-words text-sm text-rose-100/80">{loadError.message}</p>
            <p className="mt-2 text-xs text-slate-400">Please refresh the page. If this continues, the database permissions or query need attention.</p>
          </div>
        )}

        {!loadError && !trades?.length && (
          <section className="mt-10 rounded-2xl border border-white/10 bg-[#101a2a] px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-400/20 bg-blue-400/10 text-2xl text-blue-300">↗</div>
            <h2 className="mt-5 text-2xl font-semibold">No public trade ideas yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Official trade ideas will appear here after the administrator creates a setup and selects “Publish now”. Drafts and private journal entries are not shown on this page.
            </p>
            {isAdmin && (
              <Link href="/admin/trades/new" className="mt-6 inline-flex rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">
                + Publish the first trade idea
              </Link>
            )}
            {!user && <p className="mt-5 text-xs text-slate-500">New public setups will be displayed here as soon as they are published.</p>}
          </section>
        )}

        <div className="mt-8 grid gap-6">
          {trades?.map((trade) => {
            const tradeImages = (images ?? []).filter((image) => image.public_trade_id === trade.id);
            const tradeTargets = (targets ?? []).filter((target) => target.public_trade_id === trade.id);
            return (
              <PublicTradeActions tradeId={trade.id} instrument={trade.instrument} imagePaths={tradeImages.map((image) => image.storage_path)} admin={isAdmin}><article key={trade.id} className="rounded-2xl border border-white/10 bg-[#101a2a] p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{trade.instrument}</h2>
                    <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">
                      {trade.market?.replaceAll("_", " ")} · {trade.direction} · {trade.status?.replaceAll("_", " ")}
                    </p>
                  </div>
                  <span className={trade.direction === "long" ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300" : "rounded-full bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-300"}>
                    {trade.direction.toUpperCase()}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-y border-white/10 py-5 text-sm sm:grid-cols-3">
                  <div><p className="text-xs text-slate-500">Entry</p><p className="mt-1 font-medium">{trade.entry_price ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Stop loss</p><p className="mt-1 font-medium">{trade.stop_loss ?? "—"}</p></div>
                  {tradeTargets.map((target) => <div key={target.target_number}><p className="text-xs text-slate-500">Target {target.target_number} · {target.status}</p><p className="mt-1 font-medium">{target.price}</p></div>)}
                </div>

                {trade.thesis && <section className="mt-5"><h3 className="text-sm font-semibold text-blue-200">Trade thesis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.thesis}</p></section>}
                {trade.fundamental_analysis && <section className="mt-5 border-t border-white/10 pt-5"><h3 className="text-sm font-semibold text-blue-200">Fundamental analysis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.fundamental_analysis}</p></section>}
                {trade.intermarket_analysis && <section className="mt-5 border-t border-white/10 pt-5"><h3 className="text-sm font-semibold text-blue-200">Intermarket analysis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{trade.intermarket_analysis}</p></section>}

                <TradeImageGallery
                  instrument={trade.instrument}
                  images={tradeImages.map((image) => ({
                    url: supabase.storage.from("public-trade-images").getPublicUrl(image.storage_path).data.publicUrl,
                    alt: trade.instrument + " trade setup chart",
                  }))}
                />
                <p className="mt-6 text-xs text-slate-500">Published {trade.published_at ? new Date(trade.published_at).toLocaleDateString() : ""}</p>
              </article></PublicTradeActions>
            );
          })}
        </div>
      </div>
    </main>
  );
}
