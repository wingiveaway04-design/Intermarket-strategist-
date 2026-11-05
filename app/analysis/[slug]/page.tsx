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
  return (
    <main className="min-h-screen px-5 py-10 md:px-12">
      <article className="mx-auto max-w-4xl">
        <Link href="/analysis" className="text-sm text-cyan-300">← Research library</Link>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[.18em] text-violet-300">{category}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">{article.title}</h1>
        <p className="mt-4 text-slate-400">{article.excerpt}</p>
        <p className="mt-3 text-xs text-slate-500">{article.published_at ? new Date(article.published_at).toLocaleDateString() : "Research note"}</p>
        {!user ? (
          <section className="mt-8 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-6">
            <h2 className="text-xl font-semibold">{article.is_premium_only?"Premium research access":"Free member research"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{article.is_premium_only?"This complete research note is reserved for Premium members. Sign in to check your access or explore the subscription plans.":"Create a free account or sign in to read this research note."}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950">Sign in</Link>
              {!article.is_premium_only&&<Link href="/register" className="rounded-lg border border-white/15 px-4 py-3 text-sm">Create free account</Link>}
              {article.is_premium_only&&<Link href="/pricing" className="rounded-lg border border-white/15 px-4 py-3 text-sm">View Premium plans</Link>}
            </div>
          </section>
        ) : !hasPremium ? (
          <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-400/5 p-6">
            <h2 className="text-xl font-semibold">Upgrade to Premium</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">This article is part of the Premium research library. Free members can read selected research; Premium members can access the complete library.</p>
            <Link href="/pricing" className="mt-5 inline-flex rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950">Explore Premium plans</Link>
          </section>
        ) : (
          <>
            <section className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap leading-7">{content?.body_md || "The full research note has no body content yet."}</section>
            {embed && <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Research video</h2><div className="aspect-video overflow-hidden rounded-xl border border-white/10"><iframe src={embed} title={article.title + " video"} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></section>}
            {signedVideo && <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Research video</h2><video controls preload="metadata" className="w-full rounded-xl border border-white/10" src={signedVideo}>Your browser does not support video playback.</video><p className="mt-2 text-xs text-slate-500">Private video link expires after one hour.</p></section>}
          </>
        )}
      </article>
    </main>
  );
}
