-- Intermarket Strategist: foundational relational schema and RLS.
-- Apply with Supabase CLI: supabase db push
create extension if not exists pgcrypto;

create type public.app_role as enum ('user', 'admin');
create type public.market_category as enum ('forex','commodities','equities','indices','cryptocurrency','fixed_income','other');
create type public.trade_direction as enum ('long','short');
create type public.trade_status as enum ('in_progress','all_targets_hit','stopped_out','breakeven','closed_manually','cancelled');
create type public.content_status as enum ('draft','published','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (length(username) between 3 and 30),
  display_name text,
  avatar_path text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role is intentionally not accepted from client profile updates. Provision admin via trusted SQL only.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare requested_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  insert into public.profiles (id, username, display_name, role)
  values (new.id, requested_username, coalesce(new.raw_user_meta_data ->> 'display_name', requested_username), 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.public_trades (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  instrument text not null,
  market public.market_category not null,
  direction public.trade_direction not null,
  status public.trade_status not null default 'in_progress',
  entry_price numeric,
  stop_loss numeric,
  thesis text,
  fundamental_analysis text,
  intermarket_analysis text,
  risk_reward numeric,
  author_id uuid not null references public.profiles(id),
  content_state public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((content_state <> 'published') or published_at is not null)
);

create table public.private_trades (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  instrument text not null,
  market public.market_category not null,
  direction public.trade_direction not null,
  status public.trade_status not null default 'in_progress',
  entry_price numeric,
  stop_loss numeric,
  thesis text,
  fundamental_analysis text,
  intermarket_analysis text,
  risk_reward numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  realized_r numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trade_targets (
  id uuid primary key default gen_random_uuid(),
  public_trade_id uuid references public.public_trades(id) on delete cascade,
  private_trade_id uuid references public.private_trades(id) on delete cascade,
  target_number integer not null check (target_number > 0),
  price numeric not null,
  status text not null default 'pending' check (status in ('pending','hit','partial','cancelled')),
  exit_fraction numeric check (exit_fraction between 0 and 1),
  hit_at timestamptz,
  created_at timestamptz not null default now(),
  check ((public_trade_id is not null)::int + (private_trade_id is not null)::int = 1),
  unique (public_trade_id, target_number),
  unique (private_trade_id, target_number)
);

create table public.trade_updates (
  id uuid primary key default gen_random_uuid(),
  public_trade_id uuid references public.public_trades(id) on delete cascade,
  private_trade_id uuid references public.private_trades(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  update_type text not null,
  body text not null,
  created_at timestamptz not null default now(),
  check ((public_trade_id is not null)::int + (private_trade_id is not null)::int = 1)
);

create table public.analysis_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body_md text not null default '',
  author_id uuid not null references public.profiles(id),
  content_state public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((content_state <> 'published') or published_at is not null)
);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  public_trade_id uuid references public.public_trades(id) on delete cascade,
  private_trade_id uuid references public.private_trades(id) on delete cascade,
  storage_path text not null unique,
  visibility text not null check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  check ((public_trade_id is not null)::int + (private_trade_id is not null)::int = 1)
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  default_risk numeric check (default_risk > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_trades_published_idx on public.public_trades(content_state, published_at desc);
create index private_trades_owner_created_idx on public.private_trades(owner_id, created_at desc);
create index trade_targets_public_idx on public.trade_targets(public_trade_id);
create index trade_targets_private_idx on public.trade_targets(private_trade_id);
create index trade_updates_public_idx on public.trade_updates(public_trade_id, created_at desc);
create index trade_updates_private_idx on public.trade_updates(private_trade_id, created_at desc);

create function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.public_trades enable row level security;
alter table public.private_trades enable row level security;
alter table public.trade_targets enable row level security;
alter table public.trade_updates enable row level security;
alter table public.analysis_articles enable row level security;
alter table public.images enable row level security;
alter table public.user_settings enable row level security;

-- Profiles: public display fields are readable; only self can update, role cannot be changed by user.
create policy "Profiles are readable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id and role = (select role from public.profiles p where p.id = (select auth.uid())));

-- Public trade/article data: published records readable by visitors; all writes require admin.
create policy "Published trades are public" on public.public_trades for select using (content_state = 'published' or public.is_admin());
create policy "Admins manage public trades" on public.public_trades for all using (public.is_admin()) with check (public.is_admin());
create policy "Published articles are public" on public.analysis_articles for select using (content_state = 'published' or public.is_admin());
create policy "Admins manage articles" on public.analysis_articles for all using (public.is_admin()) with check (public.is_admin());

-- Private journal isolation: authenticated owner can only read/change their own records.
create policy "Owners read own private trades" on public.private_trades for select using ((select auth.uid()) = owner_id);
create policy "Owners create own private trades" on public.private_trades for insert with check ((select auth.uid()) = owner_id);
create policy "Owners update own private trades" on public.private_trades for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Owners delete own private trades" on public.private_trades for delete using ((select auth.uid()) = owner_id);

create policy "Targets for published public trades readable" on public.trade_targets for select using (
  (public_trade_id is not null and exists(select 1 from public.public_trades t where t.id = public_trade_id and t.content_state = 'published'))
  or (private_trade_id is not null and exists(select 1 from public.private_trades t where t.id = private_trade_id and t.owner_id = (select auth.uid())))
  or public.is_admin()
);
create policy "Admins manage public targets" on public.trade_targets for all using (public.is_admin()) with check (public.is_admin());
create policy "Owners manage private targets" on public.trade_targets for all using (
  private_trade_id is not null and exists(select 1 from public.private_trades t where t.id = private_trade_id and t.owner_id = (select auth.uid()))
) with check (
  private_trade_id is not null and exists(select 1 from public.private_trades t where t.id = private_trade_id and t.owner_id = (select auth.uid()))
);

create policy "Trade updates visible by scope" on public.trade_updates for select using (
  (public_trade_id is not null and exists(select 1 from public.public_trades t where t.id = public_trade_id and t.content_state = 'published'))
  or (private_trade_id is not null and exists(select 1 from public.private_trades t where t.id = private_trade_id and t.owner_id = (select auth.uid())))
  or public.is_admin()
);
create policy "Admins manage public updates" on public.trade_updates for all using (public.is_admin()) with check (public.is_admin());
create policy "Owners manage private updates" on public.trade_updates for all using (
  private_trade_id is not null and exists(select 1 from public.private_trades t where t.id = private_trade_id and t.owner_id = (select auth.uid()))
) with check (
  private_trade_id is not null and exists(select 1 from public.private_trades t where t.id = private_trade_id and t.owner_id = (select auth.uid()))
);

create policy "Images visible by visibility and owner" on public.images for select using (
  (visibility = 'public' and public_trade_id is not null and exists(select 1 from public.public_trades t where t.id = public_trade_id and t.content_state = 'published'))
  or owner_id = (select auth.uid())
  or public.is_admin()
);
create policy "Owners add images" on public.images for insert with check (owner_id = (select auth.uid()) and (
  (private_trade_id is not null and exists(select 1 from public.private_trades t where t.id = private_trade_id and t.owner_id = (select auth.uid())))
  or (public_trade_id is not null and public.is_admin())
));
create policy "Owners delete images" on public.images for delete using (owner_id = (select auth.uid()) or public.is_admin());

create policy "Users manage own settings" on public.user_settings for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Secure admin provisioning: after the owner account registers, execute this in Supabase SQL Editor
-- using the known account UUID, never via a public client-side form:
-- update public.profiles set role = 'admin' where id = '<trusted-auth-user-uuid>';
