import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function youtubeEmbed(value: string) {
  try {
    const url = new URL(value);
    let id = "";
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    else if (url.hostname.endsWith("youtube.com")) id = url.pathname === "/watch" ? url.searchParams.get("v") || "" : url.pathname.split("/").filter(Boolean).pop() || "";
    return id ? "https://www.youtube-nocookie.com/embed/" + id : null;
  } catch { return null; }
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "Research note";
}

export default async function ResearchDetailPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: article } = await supabase.from("analysis_articles")
    .select("id,slug,title,excerpt,category,published_at,video_url,is_premium_only")
    .eq("slug", params.slug).eq("content_state", "published").maybeSingle();
  if (!article) notFound();

  let hasPremium = false;
  let content: { body_md: string; video_path: string | null } | null = null;
  if (user) {
    const { data: premium } = await supabase.rpc("has_premium_access", { check_user_id: user.id });
    hasPremium = Boolean(premium);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin") hasPremium = true;
    if (hasPremium || !article.is_premium_only) {
      const { data } = await supabase.from("analysis_article_content")
        .select("body_md,video_path").eq("article_id", article.id).maybeSingle();
      content = data;
    }
  }

  let signedVideo: string | null = null;
  if (user && (hasPremium || !article.is_premium_only) && content?.video_path) {
    const { data } = await supabase.storage.from("research-videos").createSignedUrl(content.video_path, 3600);
    signedVideo = data?.signedUrl || null;
  }
  const embed = article.video_url ? youtubeEmbed(article.video_url) : null;
  const category = String(article.category || "cross_market").replaceAll("_", " ");
  const canRead = Boolean(user) && (hasPremium || !article.is_premium_only);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 sm:py-10 lg:px-10">
      <article className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <Link href="/analysis" className="text-xs font-bold tracking-[.18em] text-cyan-300">INTERMARKET STRATEGIST</Link>
          <Link href="/analysis" className="text-sm text-slate-400 transition hover:text-cyan-200">← Research library</Link>
        </header>
        <section className="mt-8 rounded-3xl border border-cyan-300/15 bg-[radial-gradient(ellipse_at_top_right,_rgba(34,211,238,0.14),_transparent_48%),linear-gradient(125deg,#10243a,#0b1728_65%,#15152c)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-cyan-200">{category}</span>
            {article.is_premium_only ? <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-violet-200">Premium research</span> : <span className="rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-200">Free member research</span>}
            {article.video_url && <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-300">Video included</span>}
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">{article.title}</h1>
          {article.excerpt && <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">{article.excerpt}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-xs text-slate-500">
            <span>Published {formatDate(article.published_at)}</span>
            <span aria-hidden="true">·</span>
            <span>{canRead ? hasPremium ? "Premium access" : "Free member access" : article.is_premium_only ? "Premium access required" : "Member sign-in required"}</span>
          </div>
        </section>

        {!user ? (
          <section className="mt-7 rounded-2xl border border-white/10 bg-[#101d30] p-6 sm:p-7">
            <h2 className="text-xl font-semibold">{article.is_premium_only ? "Unlock the complete Premium analysis" : "Sign in to read this research"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{article.is_premium_only ? "This publication is reserved for Premium members. Sign in to check your access or explore membership plans." : "This research is available to registered members. Create a free account or sign in to continue."}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">Sign in</Link>
              {!article.is_premium_only && <Link href="/register" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold">Create free account</Link>}
              {article.is_premium_only && <Link href="/pricing" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold">View Premium plans</Link>}
            </div>
          </section>
        ) : article.is_premium_only && !hasPremium ? (
          <section className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-200">Premium access</p>
            <h2 className="mt-2 text-xl font-semibold">Unlock the complete research note</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">You can review the publication summary above. The full analysis and any attached private video are available to Premium members.</p>
            <Link href="/pricing" className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">Explore Premium plans</Link>
          </section>
        ) : (
          <>
            <section className="mt-7 rounded-2xl border border-white/10 bg-[#0e1b2c] p-5 sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <h2 className="text-sm font-semibold uppercase tracking-[.15em] text-cyan-200">Full research analysis</h2>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">AIS Research Desk</span>
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-8 text-slate-200 sm:text-base">{content?.body_md || "The full research note has no body content yet."}</div>
            </section>
            {embed && <section className="mt-8"><h2 className="mb-3 text-lg font-semibold">Research video</h2><div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"><iframe src={embed} title={article.title + " video"} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></section>}
            {signedVideo && <section className="mt-8"><h2 className="mb-3 text-lg font-semibold">Research video</h2><video controls preload="metadata" className="w-full rounded-2xl border border-white/10" src={signedVideo}>Your browser does not support video playback.</video><p className="mt-2 text-xs text-slate-500">Private video link expires after one hour.</p></section>}
          </>
        )}
        <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <Link href="/analysis" className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">← Back to research library</Link>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-cyan-200">AIS Terminal</Link>
        </footer>
      </article>
    </main>
  );
}
