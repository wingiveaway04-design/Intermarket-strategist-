-- Fix PostgREST return-type mismatch in administrator member search.
-- Explicit casts ensure every selected expression matches the declared text columns.
create or replace function public.admin_search_users(search_term text)
returns table(user_id uuid,email text,display_name text,username text)
language plpgsql
stable
security definer
set search_path = public, auth
as $function$
declare
  normalized_term text := regexp_replace(lower(trim(coalesce(search_term,''))), '^@', '');
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles ap
    where ap.id = auth.uid() and ap.role::text = 'admin'
  ) then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if length(normalized_term) < 2 then return; end if;
  return query
  select u.id,
         coalesce(u.email, '')::text,
         coalesce(nullif(p.display_name::text,''), nullif(p.username::text,''), 'Member')::text,
         coalesce(p.username::text, '')::text
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(coalesce(u.email, '')) like '%' || normalized_term || '%'
     or lower(coalesce(p.username::text, '')) like '%' || normalized_term || '%'
     or lower(coalesce(p.display_name::text, '')) like '%' || normalized_term || '%'
  order by case
    when lower(coalesce(u.email, '')) = normalized_term then 0
    when lower(coalesce(p.username::text, '')) = normalized_term then 0
    when lower(coalesce(u.email, '')) like normalized_term || '%' then 1
    when lower(coalesce(p.username::text, '')) like normalized_term || '%' then 1
    else 2 end,
    u.created_at desc
  limit 30;
end;
$function$;
revoke all on function public.admin_search_users(text) from public;
revoke all on function public.admin_search_users(text) from anon;
grant execute on function public.admin_search_users(text) to authenticated;
notify pgrst, 'reload schema';
