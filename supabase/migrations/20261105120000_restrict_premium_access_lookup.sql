-- Restrict Premium-access lookups to the signed-in user or an administrator.
-- The function remains SECURITY INVOKER so table RLS is respected.
create or replace function public.has_premium_access(check_user_id uuid)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if check_user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'You may only check your own Premium access' using errcode = '42501';
  end if;

  return exists (
    select 1
    from public.subscriptions s
    where s.user_id = check_user_id
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
  ) or exists (
    select 1
    from public.subscription_gifts g
    where g.user_id = check_user_id
      and g.revoked_at is null
      and g.starts_at <= now()
      and g.expires_at > now()
  );
end;
$function$;

revoke all on function public.has_premium_access(uuid) from public;
revoke all on function public.has_premium_access(uuid) from anon;
grant execute on function public.has_premium_access(uuid) to authenticated;
