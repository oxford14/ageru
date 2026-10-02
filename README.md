# SocialBoost Panel

Production-ready customer/reseller SMM ordering panel built with Next.js App Router, Supabase, and pluggable provider/payment adapters.

## Features

- Customer panel: dashboard, multi-step orders, service catalog, wallet, transactions, support
- Admin panel: KPIs, orders, services, provider management, service import, audit logs
- Provider abstraction (`SmmV2Provider`, `ManualProvider`) — secrets stay server-side
- PayMongo-ready payments with webhook-verified wallet credits
- Atomic wallet RPCs (reserve, deposit, refund)
- Vercel cron-compatible order/balance sync

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `ENCRYPTION_KEY` — 32-byte base64 or passphrase for provider API key encryption
- `CRON_SECRET` — random string for cron auth
- `PAYMENT_PROVIDER=manual` for local wallet testing (or `paymongo` with keys)
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

```bash
npm run dev
```

## Supabase (remote project)

SQL migrations are **not** included in this repository. Provision your own Supabase project and apply schema separately (types in `lib/supabase/database.types.ts` match the expected schema).

Link the CLI for local tooling if needed:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

## Admin account

1. Register a user via `/register`
2. Promote to admin (SQL in Supabase SQL editor):

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

Or one-time bootstrap (only when no admin exists):

```bash
curl -X POST http://localhost:3000/api/admin/bootstrap
```

Requires `BOOTSTRAP_ADMIN_EMAIL` in env.

## Provider configuration

1. Open `/admin/providers`
2. Use built-in **Manual Test Provider** (seeded) for demo services
3. Add **SMM v2** provider with API URL + key (stored encrypted, never sent to browser)
4. Import services via `/admin/services/import`

## PayMongo

Set:

- `PAYMENT_PROVIDER=paymongo`
- `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET`

Webhook URL: `https://your-domain.com/api/payments/webhook`

Wallet credits only after verified webhook — not from client redirect alone.

## Vercel deployment

1. Import repo, set all env vars from `.env.example`
2. Deploy
3. Configure cron secret on Vercel (Authorization: Bearer `CRON_SECRET`)
4. Crons defined in `vercel.json`

## Production security checklist

- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`
- [ ] Set `PAYMENT_PROVIDER=paymongo` (disable manual payment in prod)
- [ ] Set `MANUAL_PROVIDER_SIMULATOR=false` / disable demo services if not needed
- [ ] Run Supabase advisors (RLS, security)
- [ ] Confirm RLS enabled on all public tables
- [ ] Never put secrets in `NEXT_PUBLIC_*`

## Architecture

```
UI → lib/services → Provider/Payment interfaces → external APIs
```

Rate basis: **customer_rate** and **provider_rate** are per **1000 units** (PHP `NUMERIC`).
