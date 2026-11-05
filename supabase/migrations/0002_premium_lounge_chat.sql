-- Premium Lounge: in-browser voice recording, attachments, replies and mentions.
alter table public.premium_chat_messages
  add column if not exists reply_to_id uuid references public.premium_chat_messages(id) on delete set null,
  add column if not exists mentioned_user_ids uuid[] not null default '{}',
  add column if not exists media_type text,
  add column if not exists file_name text;

alter table public.premium_chat_messages drop constraint if exists premium_chat_messages_check;
alter table public.premium_chat_messages drop constraint if exists premium_chat_messages_message_type_check;
alter table public.premium_chat_messages
  add constraint premium_chat_messages_message_type_check
  check (message_type in ('text','voice','image','file'));
alter table public.premium_chat_messages
  add constraint premium_chat_messages_content_check
  check (
    (message_type = 'text' and length(trim(body)) > 0 and media_path is null)
    or (message_type in ('voice','image','file') and media_path is not null)
  );

drop policy if exists "Premium members post lounge messages" on public.premium_chat_messages;
create policy "Premium members post lounge messages"
on public.premium_chat_messages for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (public.is_admin() and message_type in ('text','voice','image','file'))
    or
    (not public.is_admin() and public.has_premium_access((select auth.uid()))
      and message_type in ('text','image','file'))
  )
);

create index if not exists premium_chat_messages_reply_idx
  on public.premium_chat_messages(reply_to_id);
create index if not exists premium_chat_messages_created_idx
  on public.premium_chat_messages(created_at desc);

create or replace function public.notify_premium_chat_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_name text;
  recipient_id uuid;
  parent_author uuid;
begin
  select coalesce(p.display_name, p.username, 'A member')
    into sender_name
    from public.profiles p where p.id = new.user_id;

  if new.reply_to_id is not null then
    select m.user_id into parent_author
      from public.premium_chat_messages m where m.id = new.reply_to_id;
    if parent_author is not null and parent_author <> new.user_id then
      insert into public.notifications(user_id,title,body,href,audience)
      values(parent_author,'New reply in Premium Lounge',sender_name || ' replied to your message.','/lounge','premium');
    end if;
  end if;

  foreach recipient_id in array coalesce(new.mentioned_user_ids, '{}') loop
    if recipient_id is not null and recipient_id <> new.user_id
       and recipient_id is distinct from parent_author then
      insert into public.notifications(user_id,title,body,href,audience)
      values(recipient_id,'You were mentioned in Premium Lounge',sender_name || ' mentioned you in a message.','/lounge','premium');
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists premium_chat_activity_notification on public.premium_chat_messages;
create trigger premium_chat_activity_notification
after insert on public.premium_chat_messages
for each row execute function public.notify_premium_chat_activity();

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif','image/avif',
  'audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav',
  'application/pdf','text/plain','text/csv',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]::text[],
file_size_limit = 20971520
where id = 'premium-lounge';

do $$
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='premium_chat_messages') then
    alter publication supabase_realtime add table public.premium_chat_messages;
  end if;
end $$;
