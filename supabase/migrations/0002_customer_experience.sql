-- Customer profile, notification and Premium Lounge additions.
alter table public.profiles add column if not exists bio text check (bio is null or length(bio)<=240);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, body text not null default '', href text not null default '/dashboard',
 audience text not null default 'all' check (audience in ('all','premium')),
 read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
alter table public.notifications enable row level security;
create policy "Users read own notifications" on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy "Users update own notifications" on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke insert,delete on public.notifications from anon,authenticated;
revoke update on public.notifications from authenticated;\ngrant select on public.notifications to authenticated;\ngrant update(read_at) on public.notifications to authenticated;

create schema if not exists private;
create or replace function private.user_has_premium(target_user uuid) returns boolean language plpgsql stable security definer set search_path=''
as $
begin
 if target_user is distinct from (select auth.uid()) and not public.is_admin() then raise exception 'You may only check your own Premium access' using errcode='42501'; end if;
 return exists(select 1 from public.subscriptions s where s.user_id=target_user and s.status='active' and (s.current_period_end is null or s.current_period_end>now())) or exists(select 1 from public.subscription_gifts g where g.user_id=target_user and g.revoked_at is null and g.starts_at<=now() and g.expires_at>now());
end;
$;
grant usage on schema private to authenticated;
grant execute on function private.user_has_premium(uuid) to authenticated;
revoke all on function private.user_has_premium(uuid) from anon;

alter table public.analysis_articles add column if not exists is_premium_only boolean not null default false;
create or replace function public.notify_published_content() returns trigger language plpgsql security definer set search_path=''
as $$
declare v_title text;v_body text;v_href text;v_audience text;
begin
 if tg_table_name='public_trades' then v_title:='New trade analysis: '||new.instrument;v_body:='A new official trade setup has been published.';v_href:='/setups';v_audience:='all';
 else v_title:='New market research: '||new.title;v_body:=coalesce(new.excerpt,'A new research analysis is available.');v_href:='/analysis';v_audience:=case when new.is_premium_only then 'premium' else 'all' end;end if;
 if new.content_state='published' and (tg_op='INSERT' or old.content_state is distinct from 'published') then
 insert into public.notifications(user_id,title,body,href,audience) select p.id,v_title,v_body,v_href,v_audience from public.profiles p where p.id<>new.author_id and (v_audience='all' or private.user_has_premium(p.id));end if;return new;
end;$$;
create trigger notify_public_trade_published after insert or update of content_state on public.public_trades for each row execute function public.notify_published_content();
create trigger notify_analysis_published after insert or update of content_state on public.analysis_articles for each row execute function public.notify_published_content();\nrevoke all on function public.notify_published_content() from public,anon,authenticated;

create table if not exists public.premium_chat_messages (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 message_type text not null default 'text' check(message_type in ('text','voice','image')),body text not null default '',media_path text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((message_type='text' and length(trim(body))>0 and media_path is null) or (message_type in ('voice','image') and media_path is not null))
);
create index if not exists premium_chat_messages_created_idx on public.premium_chat_messages(created_at desc);
alter table public.premium_chat_messages enable row level security;
create policy "Premium members read lounge" on public.premium_chat_messages for select to authenticated using(public.is_admin() or public.has_premium_access((select auth.uid())));
create policy "Premium members post lounge messages" on public.premium_chat_messages for insert to authenticated with check(user_id=(select auth.uid()) and ((public.is_admin() and message_type in ('text','voice','image')) or (not public.is_admin() and public.has_premium_access((select auth.uid())) and message_type in ('text','image'))));
create policy "Authors or admins delete lounge messages" on public.premium_chat_messages for delete to authenticated using(user_id=(select auth.uid()) or public.is_admin());
grant select,insert,delete on public.premium_chat_messages to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('profile-avatars','profile-avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
('premium-lounge','premium-lounge',false,20971520,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Users read own profile avatars" on storage.objects for select to authenticated using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Users upload own profile avatars" on storage.objects for insert to authenticated with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Users update own profile avatars" on storage.objects for update to authenticated using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Premium lounge members read media" on storage.objects for select to authenticated using(bucket_id='premium-lounge' and (public.is_admin() or private.user_has_premium((select auth.uid()))));
create policy "Premium lounge members upload media" on storage.objects for insert to authenticated with check(bucket_id='premium-lounge' and (storage.foldername(name))[1]=(select auth.uid())::text and (public.is_admin() or private.user_has_premium((select auth.uid()))));
create policy "Premium lounge owners delete media" on storage.objects for delete to authenticated using(bucket_id='premium-lounge' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));
do $ begin alter publication supabase_realtime add table public.premium_chat_messages; exception when duplicate_object then null; end $;\ndo $ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $;
