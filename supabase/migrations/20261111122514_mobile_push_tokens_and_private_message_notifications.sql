-- Shared mobile push-token registry and private-message inbox notifications.
-- Device tokens are owned by the authenticated user; privileged delivery remains server-side.

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists user_push_tokens_user_id_idx
  on public.user_push_tokens(user_id);

alter table public.user_push_tokens enable row level security;

grant select, insert, update, delete on public.user_push_tokens to authenticated;

drop policy if exists "Users manage their own push tokens" on public.user_push_tokens;
create policy "Users manage their own push tokens"
  on public.user_push_tokens
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.notify_private_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin_id uuid;
  v_member_id uuid;
  v_recipient_id uuid;
  v_body text;
begin
  select c.admin_id, c.member_id
    into v_admin_id, v_member_id
    from public.premium_direct_conversations c
    where c.id = new.conversation_id;

  if not found then
    return new;
  end if;

  if new.sender_id = v_admin_id then
    v_recipient_id := v_member_id;
  elsif new.sender_id = v_member_id then
    v_recipient_id := v_admin_id;
  else
    return new;
  end if;

  if v_recipient_id is null or v_recipient_id = new.sender_id then
    return new;
  end if;

  v_body := case new.message_type
    when 'voice' then 'You received a voice message.'
    when 'image' then 'You received an image.'
    when 'video' then 'You received a video.'
    when 'file' then 'You received a file.'
    else 'You received a new private message.'
  end;

  insert into public.notifications (user_id, title, body, href, audience)
  values (v_recipient_id, 'New private message', v_body, '/messages', 'premium');

  return new;
end;
$function$;

revoke all on function public.notify_private_direct_message() from public, anon, authenticated;

drop trigger if exists notify_private_direct_message on public.premium_direct_messages;
create trigger notify_private_direct_message
  after insert on public.premium_direct_messages
  for each row execute function public.notify_private_direct_message();
