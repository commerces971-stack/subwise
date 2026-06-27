# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server on localhost:3000
npm run build        # production build
npm run lint         # ESLint via next lint
npx prisma studio    # Prisma GUI to inspect DB
npx prisma migrate dev --name <name>   # create + apply a migration
npx prisma generate  # regenerate Prisma Client after schema changes
```

No test suite is set up yet.

## Architecture

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma → Supabase (PostgreSQL) · NextAuth.js v4 · Resend (email) · Stripe · Maileva API

### Request flow

```
Browser → Next.js middleware (src/middleware.ts)
        → App Router page (src/app/…/page.tsx)  ← server component, calls getServerSession()
        → Next.js API Route (src/app/api/…/route.ts)
        → Prisma (src/lib/prisma.ts) → Supabase PostgreSQL
```

Middleware protects `/dashboard/*` with NextAuth's default middleware export.

### Auth (`src/lib/auth.ts`)

Two providers: **Google OAuth** and **Email magic-link** (sent via Resend). Session strategy is `database` (stored in `Session` table via PrismaAdapter). `session.user.id` is injected in the `session` callback. Import `authOptions` wherever you need `getServerSession`.

### Database (`prisma/schema.prisma`)

`DATABASE_URL` uses pgbouncer (port 6543) — for queries. `DIRECT_URL` bypasses pgbouncer (port 5432) — required for migrations. Both are set in `.env`.

Key domain models:
- `User` owns `Subscription[]`, `Notification[]`
- `Subscription` → `Notification[]` (J-45 alerts), `TransitionOrder[]` (paid 4.99€ actions)
- `Alternative` is a standalone catalogue (no user FK), filtered by `category`
- `TransitionOrder` tracks the full lifecycle: Stripe payment + Maileva send

### Subscription categories (MVP)

The 7 fixed categories used in `Subscription.category`:
`téléphonie mobile` · `internet box` · `streaming` · `assurance auto` · `assurance habitation` · `mutuelle santé` · `salle de sport`

### Key conventions

- All API routes live under `src/app/api/` and must validate the session with `getServerSession(authOptions)` before touching the DB — return 401 otherwise.
- Server components fetch data directly (no fetch to own API). Client components call API routes.
- `src/lib/prisma.ts` exports a singleton `prisma` (dev hot-reload safe via `globalThis`).

## Business logic

- **J-45 alert**: a daily cron at 08:00 scans subscriptions where `renewalDate` is exactly 45 days away and creates a `Notification` + sends email via Resend.
- **Transition order (4.99€)**: user pays Stripe → webhook sets `TransitionOrder.status = 'paid'` → Maileva API sends registered letter → `mailevaSendId` stored for proof.
- `serviceFee` (4.99) and `mailevaCost` are stored separately on `TransitionOrder` so both can be charged in one Stripe PaymentIntent.

## Implementation roadmap

1. ✅ Scaffold Next.js + Prisma + Auth
2. ✅ DB models + migration (`20260619192021_init`)
3. → CRUD abonnements (API + UI) ← **current step**
4. Système notifications J-45 + cron + email
5. Catalogue alternatives + comparateur UI
6. Paiement 4.99€ (Stripe) + Maileva + mandat électronique
7. Dashboard analytics (Recharts)
8. Tests + déploiement Vercel
