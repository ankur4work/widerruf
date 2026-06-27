# Widerruf: EU Withdrawal Button

EU Directive 2023/2673 (Art. 11a CRD) compliant withdrawal button & form for Shopify.
Built to fix the top complaints of existing apps: **genuinely free core, never breaks
your theme/SEO, and CSP-safe storefront rendering.**

Stack: Remix + TypeScript + Prisma + PostgreSQL + Polaris + `@shopify/shopify-app-remix`.

## Architecture (why it's safe)

- **Button** = Theme App Extension **App Embed block** (`extensions/withdrawal-button`).
  Additive only — it never disables or replaces theme sections.
- **Form page** = **App Proxy** at `/apps/withdrawal`
  (`app/routes/apps.withdrawal._index.tsx`). Fully **server-side rendered, zero JS**
  → no inline-script/CSP breakage, theme-agnostic, SEO-safe (noindex).
- **2-step flow** (collect → review/confirm) via plain HTML POST, per Art. 11a.
- **Confirmation email** with exact UTC timestamp = durable-medium proof.
- **Audit trail** (`AuditEvent`) per request for legal traceability.

## Project layout

```
app/
  shopify.server.ts            Shopify app config (sessions, webhooks, afterAuth bootstrap)
  db.server.ts                 Prisma client
  lib/i18n.ts                  24 EU languages, legally-correct button labels
  lib/email.server.ts          Confirmation email (nodemailer/SMTP)
  routes/
    app._index.tsx             Merchant dashboard (requests + audit + process)
    app.settings.tsx           Editable form text, button mode, language, window
    apps.withdrawal._index.tsx App Proxy: the public withdrawal form (the core)
    auth.$.tsx / auth.login.tsx OAuth
    webhooks.tsx / health.tsx
extensions/withdrawal-button/  Theme App Embed button (footer link / floating)
prisma/                        schema + initial migration
```

## One manual step (you must do this)

1. **Shopify Partner Dashboard → Apps → Create app** (custom/public).
2. Copy the **Client ID (API key)** and **Client secret**.
3. Put the Client ID in `shopify.app.toml` (`client_id`) and both in `.env`
   (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`).
4. Point DNS `widerruf.onkra.online` → the server (91.239.208.85).

## Local dev

```bash
npm install
cp .env.example .env   # fill in keys + DATABASE_URL
npm run dev            # shopify app dev
```

## Deploy (Coolify, isolated project)

- New **isolated** Coolify project + a **PostgreSQL** database (existing projects untouched).
- App built from `Dockerfile` (Node 18 alpine). `docker-start` runs
  `prisma migrate deploy` then serves.
- Required env vars: see `.env.example` (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`,
  `SHOPIFY_APP_URL`, `SCOPES`, `DATABASE_URL`, `DIRECT_URL`, SMTP_*).

## Plans

- **FREE**: button, auto proxy page, 2-step form, confirmation email, dashboard,
  editable text, audit trail, 24 languages, no forced watermark.
- **PRO (~€7/mo)**: Returns/refund sync, custom email domain, advanced branding,
  Flow, stats. (Phase 4.)

## Disclaimer

This app is a software tool to help merchants comply with EU Directive 2023/2673.
It is not legal advice.
