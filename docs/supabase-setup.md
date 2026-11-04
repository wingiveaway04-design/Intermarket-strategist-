# Supabase setup

1. Create a Supabase project.
2. Add the project URL and anon key to `.env.local` using `.env.example` as a template.
3. Install Supabase CLI and link the project: `supabase link --project-ref YOUR_PROJECT_REF`.
4. Apply schema: `supabase db push` (or run `supabase/migrations/0001_initial_schema.sql` in the SQL Editor).
5. In Supabase Auth, enable email sign-up and configure the production Site URL and redirect allowlist.
6. Register your owner account normally. In Authentication > Users, copy its UUID; then use SQL Editor to set the role to admin with the trusted SQL statement at the bottom of the migration.
7. Create storage buckets only after applying storage policies. Journal image buckets must be private; never use public URLs for private chart images.

Never place the service-role key in browser code, public GitHub commits, or any `NEXT_PUBLIC_` environment variable. The admin role must only be assigned through trusted administrative access.

## Backup

Use Supabase dashboard database backups where available and periodically export schema/data using `supabase db dump` or `pg_dump` with a protected database connection. Store exports securely and test restoration. Storage objects require their own backup/export process.
