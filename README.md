# Intermarket Strategist

A professional financial market research and trade publishing platform with administrator-managed public analysis and secure private trading journals.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- Vercel deployment

## Security principles

- Public official research and trade publishing is restricted to the provisioned administrator.
- Ordinary sign-up cannot grant administrator privileges.
- Private journal rows and files are scoped to their authenticated owner through database policies.
- Supabase service-role credentials must remain server-side and must never be exposed to the browser.

## Development status

Repository initialized. Production deployment, Supabase project configuration, authentication, database migrations, and end-to-end security tests must be completed and verified before the site can be described as live or production-ready.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and supply the Supabase project URL and anon key.
3. Run `npm run dev`.

See the project documentation and Supabase migrations as they are added.