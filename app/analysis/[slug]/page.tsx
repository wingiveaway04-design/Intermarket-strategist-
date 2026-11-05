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

  // Keep the public query separate so anonymous visitors never request body_md.
  const { data: article } = user
    ? await supabase.from("analysis_articles")
        .select("id,slug,title,excerpt,category,published_at,video_url,video_path,body_md")
        .eq("slug", params.slug).eq("content_state", "published").maybeSingle()
    : await supabase.from("analysis_articles")
        .select("id,slug,title,excerpt,category,published_at,video_url,video_path")
        .eq("slug", params.slug).eq("content_state", "published").maybeSingle();

  if (!article) notFound();
  let signedVideo: string | null = null;
  if (user && article.video_path) {
    const { data } = await supabase.storage.from("research-videos").createSignedUrl(article.video_path, 3600);
    signedVideo = data?.signedUrl || null;
  }
  const embed = article.video_url ? youtubeEmbed(article.video_url) : null;
  const category = String(article.category || "cross_market").replaceAll("_", " ");
  return <main className="min-h-screen px-5 py-10 md:px-12"><article className="mx-auto max-w-4xl"><Link href="/analysis" className="text-sm text-cyan-300">← Research library</Link><p className="mt-7 text-xs font-semibold uppercase tracking-[.18em] text-violet-300">{category}</p><h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">{article.title}</h1><p className="mt-4 text-slate-400">{article.excerpt}</p><p className="mt-3 text-xs text-slate-500">{article.published_at?new Date(article.published_at).toLocaleDateString():"Research note"}</p>
  {!user ? <section className="mt-8 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-6"><h2 className="text-xl font-semibold">Unlock the full research</h2><p className="mt-2 text-sm leading-6 text-slate-300">This is a member research note. Sign in or create an account to read the complete analysis and view its video content.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/login" className="rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950">Sign in to continue</Link><Link href="/register" className="rounded-lg border border-white/15 px-4 py-3 text-sm">Create account</Link></div></section> : <><section className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap leading-7">{("body_md" in article ? article.body_md : null) || "The full research note has no body content yet."}</section>{embed&&<section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Research video</h2><div className="aspect-video overflow-hidden rounded-xl border border-white/10"><iframe src={embed} title={article.title+" video"} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></section>}{signedVideo&&<section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Research video</h2><video controls preload="metadata" className="w-full rounded-xl border border-white/10" src={signedVideo}>Your browser does not support video playback.</video><p className="mt-2 text-xs text-slate-500">Private video link expires after one hour.</p></section>}</>}
  </article></main>;
}
