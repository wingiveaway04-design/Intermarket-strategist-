-- Allow free registered members to read research explicitly marked as free.
drop policy if exists "Premium members read article content" on public.analysis_article_content;
create policy "Members read entitled article content"
on public.analysis_article_content
for select
to authenticated
using (
  public.is_admin()
  or public.has_premium_access((select auth.uid()))
  or exists (
    select 1
    from public.analysis_articles a
    where a.id = analysis_article_content.article_id
      and a.content_state = 'published'
      and a.is_premium_only = false
  )
);

-- Apply the same entitlement rule to private uploaded research videos.
drop policy if exists "Members read videos for published research" on storage.objects;
create policy "Members read entitled research videos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'research-videos'
  and exists (
    select 1
    from public.analysis_article_content c
    join public.analysis_articles a on a.id = c.article_id
    where c.video_path = objects.name
      and a.content_state = 'published'
      and (
        public.is_admin()
        or public.has_premium_access((select auth.uid()))
        or a.is_premium_only = false
      )
  )
);
