alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check check (provider = any (array['paystack','flutterwave','stripe','manual','crypto']));

create table if not exists public.crypto_payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('monthly','yearly')),
  amount_usdt numeric(18,6) not null check (amount_usdt > 0),
  wallet_address text not null,
  network text not null default 'TRC20' check (network = 'TRC20'),
  tx_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists crypto_payment_requests_user_created_idx on public.crypto_payment_requests(user_id, created_at desc);
create index if not exists crypto_payment_requests_status_created_idx on public.crypto_payment_requests(status, created_at desc);
alter table public.crypto_payment_requests enable row level security;
drop policy if exists "Users can submit own crypto payment requests" on public.crypto_payment_requests;
create policy "Users can submit own crypto payment requests" on public.crypto_payment_requests for insert to authenticated
with check (auth.uid() = user_id and status = 'pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists "Users can view own crypto payment requests" on public.crypto_payment_requests;
create policy "Users can view own crypto payment requests" on public.crypto_payment_requests for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Admins can view crypto payment requests" on public.crypto_payment_requests;
create policy "Admins can view crypto payment requests" on public.crypto_payment_requests for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin'));
drop policy if exists "Admins can update crypto payment requests" on public.crypto_payment_requests;
create policy "Admins can update crypto payment requests" on public.crypto_payment_requests for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin'));
revoke all on public.crypto_payment_requests from anon;
grant select, insert, update on public.crypto_payment_requests to authenticated;

create or replace function public.admin_review_crypto_payment(p_request_id uuid,p_approve boolean,p_admin_note text default null)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare
 actor uuid := auth.uid();
 payment public.crypto_payment_requests%rowtype;
 start_at timestamptz := now();
 end_at timestamptz;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and role::text='admin') then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 select * into payment from public.crypto_payment_requests where id=p_request_id for update;
 if not found or payment.status <> 'pending' then return false; end if;
 if p_approve then
  end_at := case when payment.plan='monthly' then start_at+interval '1 month' else start_at+interval '1 year' end;
  insert into public.subscriptions(user_id,plan,amount_minor,currency,provider,status,current_period_start,current_period_end,updated_at)
  values(payment.user_id,payment.plan,round(payment.amount_usdt*100)::bigint,'USD','crypto','active',start_at,end_at,start_at);
  update public.crypto_payment_requests set status='approved',admin_note=nullif(trim(coalesce(p_admin_note,'')),''),reviewed_by=actor,reviewed_at=now() where id=payment.id;
 else
  update public.crypto_payment_requests set status='rejected',admin_note=nullif(trim(coalesce(p_admin_note,'')),''),reviewed_by=actor,reviewed_at=now() where id=payment.id;
 end if;
 return true;
end; $$;
revoke all on function public.admin_review_crypto_payment(uuid,boolean,text) from public;
revoke all on function public.admin_review_crypto_payment(uuid,boolean,text) from anon;
grant execute on function public.admin_review_crypto_payment(uuid,boolean,text) to authenticated;
