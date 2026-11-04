import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trades, error } = await supabase
    .from("private_trades")
    .select("id,instrument,market,direction,status,created_at,entry_price,stop_loss,thesis,fundamental_analysis,intermarket_analysis")
    .order("created_at", { ascending: false })
    .limit(30);

  const tradeIds = (trades ?? []).map((trade) => trade.id);
  const { data: images } = tradeIds.length
    ? await supabase.from("images").select("id,private_trade_id,storage_path").in("private_trade_id", tradeIds).eq("owner_id", user.id).eq("visibility", "private")
    : { data: [] as { id: string; private_trade_id: string; storage_path: string }[] };

  const imageByTrade = new Map<string, string>();
  for (const image of images ?? []) {
    const { data } = await supabase.storage.from("trade-journal").createSignedUrl(image.storage_path, 60 * 60);
    if (data?.signedUrl && !imageByTrade.has(image.private_trade_id)) {
      imageByTrade.set(image.private_trade_id, data.signedUrl);
    }
  }

  return (
    <main className="min-h-screen px-5 py-10 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-xs tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link>
            <h1 className="mt-4 text-3xl font-semibold">Your trading journal</h1>
            <p className="mt-2 text-sm text-slate-400">Private workspace for {user.email}</p>
          </div>
          <form action="/auth/signout" method="post"><button className="rounded-lg border border-white/15 px-4 py-2 text-sm">Sign out</button></form>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/journal/new" className="rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white">+ Record a trade</Link>
          <Link href="/setups" className="rounded-lg border border-white/15 px-4 py-3 text-sm">Public trade ideas</Link>
        </div>

        <section className="mt-9">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Your saved setups</h2>
            <span className="text-xs text-slate-500">Private to your account</span>
          </div>
          {error ? (
            <p className="rounded-xl border border-white/10 p-5 text-sm text-rose-300">Could not load trades. Please try again later.</p>
          ) : trades?.length ? (
            <div className="grid gap-5">
              {trades.map((trade) => {
                const screenshot = imageByTrade.get(trade.id);
                return (
                  <article key={trade.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#101a2a]">
                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold">{trade.instrument}</h3>
                          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{(trade.market ?? "").replaceAll("_", " ")} · {trade.direction}</p>
                        </div>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{(trade.status ?? "").replaceAll("_", " ")}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-black/20 p-3"><p className="text-xs text-slate-500">Entry</p><p className="mt-1 text-sm">{trade.entry_price ?? "—"}</p></div>
                        <div className="rounded-lg bg-black/20 p-3"><p className="text-xs text-slate-500">Stop loss</p><p className="mt-1 text-sm">{trade.stop_loss ?? "—"}</p></div>
                      </div>
                      {screenshot && <div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trade chart</p><img src={screenshot} alt={trade.instrument + " trade chart"} className="max-h-[420px] w-full rounded-lg border border-white/10 object-contain" /></div>}
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <section><h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300">Trade thesis</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{trade.thesis || "No thesis recorded."}</p></section>
                        <section><h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300">Fundamental analysis</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{trade.fundamental_analysis || "No fundamental analysis recorded."}</p></section>
                        <section><h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300">Intermarket analysis</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{trade.intermarket_analysis || "No intermarket analysis recorded."}</p></section>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                        <span className="text-xs text-slate-500">{new Date(trade.created_at).toLocaleDateString()}</span>
                        <Link href={"/journal/" + trade.id} className="text-sm font-medium text-blue-300 hover:text-blue-200">View full setup and targets →</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-white/10 bg-[#101a2a] p-6 text-sm text-slate-400">No journal trades yet. Use Record a trade to add your first setup.</p>
          )}
        </section>
      </div>
    </main>
  );
}
