# EU Withdrawal Button — Product & Technical Plan

> App name (SEO-optimized, 30 chars): **"Widerruf: EU Withdrawal Button"**
> Subtitle: "EU Withdrawal Form & Widerruf‑Button – 2023/2673 Compliant, SEO‑Safe"
> Backups: "Widerruf ‑ EU Withdrawal Form" / "EU Withdrawal Button & Widerruf"
> Goal: A "Built for Shopify" EU withdrawal-button app that fixes every top complaint of existing solutions.
> Legal basis: EU Directive 2023/2673 (Art. 11a CRD). Mandatory since 19 June 2026.

---

## 1. Positioning (one line)

**"The EU withdrawal button that actually works on the free plan — and never touches or breaks your existing store pages or SEO."**

Win condition = beat competitors on the 3 things they all fail at:
1. Genuinely free, fully-working core (no fake "test mode").
2. Zero damage to existing pages/SEO (no section replacement).
3. Bulletproof storefront rendering (no inline-JS/CSP breakage, theme-agnostic).

Target: small/solo EU + EU-selling merchants, all 24 EU languages (not just German).

---

## 2. Competitor problems → our fix (the core of the plan)

| # | Competitor problem (from real reviews) | Our precise fix |
|---|---|---|
| 1 | "Free" is fake — form only works in test mode until you pay | Free plan = **fully live** form, email, dashboard, audit/PDF. Money only for automation/branding. |
| 2 | App set `disabled: true` on existing theme section → broke SEO/landing pages | **Never modify theme sections.** Only add an App Embed block + a server-rendered App Proxy page. |
| 3 | Form invisible after setup — inline JS blocked by browser CSP | **App Proxy server-side rendering** + external CDN script, **zero inline JS**. CSP-safe on any theme. |
| 4 | Withdrawal page not auto-created; couldn't use footer link, only floating button | Auto-provision proxy page on install + offer **both** footer-link and floating-button modes. |
| 5 | Can't edit form field text on free (e.g. digital products vs "items to return") | All form labels/texts **editable on free plan**. |
| 6 | $10/mo just to remove watermark; forced shop logo, ugly | Minimal/no watermark on free; branding is a cheap paid perk, never forced. |
| 7 | Support took days, never fixed | Fast solo-dev support + self-serve diagnostics page. |
| 8 | UI wording too technical for non-IT merchants | Plain-language setup wizard ("1 → 2 → 3 → Done"). |
| 9 | Paywall revealed only after setup | Pricing shown clearly up front, in-app + listing. |
| 10 | App asked for a review before unlocking free mode | **Never gate on reviews** (also a Shopify policy violation). |

---

## 3. Feature set — Free vs Paid

### FREE (must genuinely work)
- "Withdraw from contract" button via **App Embed** (footer link OR floating button — merchant choice)
- Auto **dedicated withdrawal page** at `/apps/withdrawal` (App Proxy, server-rendered, SEO-safe)
- **2-step form**: Step 1 collect (name, order id, email, item/description) → Step 2 "Confirm withdrawal"
- **Auto confirmation email** with exact timestamp (durable medium)
- **Merchant dashboard**: list of requests, status (pending/processed), search
- **Editable form labels/texts** (works for physical + digital products)
- **Audit log + PDF export** (legal proof)
- **All 24 EU languages** with legally-correct button/confirm wording
- Minimal/no watermark
- NO test-mode trap, NO review-gating

### PAID (~$5–9/mo — convenience only, never legal-required basics)
- Shopify **Returns/refund auto-sync** (one-click process from dashboard → Shopify order)
- **Custom SMTP / sender domain** for confirmation emails
- **Advanced branding/design** (colors, logo, full white-label)
- **Shopify Flow** triggers + stats/analytics
- Auto-cancel unfulfilled orders on withdrawal
- Priority support

---

## 4. Legal compliance mapping (Art. 11a → feature)

| Legal requirement | Implemented by |
|---|---|
| Button labelled "Withdraw from contract" (no vague words) | i18n label set, locked to compliant wording |
| Continuously visible during withdrawal period | App Embed footer/floating block on all pages |
| No login required (guests too) | Public App Proxy page, no auth |
| Two-step (intent → confirm) | Step 1 form + Step 2 "Confirm withdrawal" button |
| Collect: name, contract/order id, contact (email) | Form fields (+ order selector if multiple) |
| Confirmation on durable medium "without undue delay" | Auto email with content + exact date/time |
| Records / traceability | DB audit log + PDF evidence pack |
| Disclaimer (we're software, not legal advice) | Shown in app + listing |

---

## 5. Technical architecture

**App type:** Shopify embedded admin app + storefront surfaces.

**Stack (aligned with existing Coolify Shopify apps):**
- **Framework:** Remix (Shopify official template) + TypeScript
- **DB:** PostgreSQL + Prisma
- **Admin UI:** Polaris + App Bridge
- **Storefront button:** Theme App Extension → **App Embed block** (no theme-section edits)
- **Storefront form page:** **App Proxy** (`/apps/withdrawal`) → server-rendered HTML from our backend
- **Email:** transactional (own SMTP on free shared sender / custom domain on paid)
- **PDF:** server-side generation (e.g. pdfkit/puppeteer-light)
- **Hosting:** new **isolated** Coolify project on existing server (do NOT touch existing projects)

### 🔑 The key technical decision (fixes complaints #2, #3, #4)
- **App Embed block** for the button = additive only, never disables/replaces existing sections.
- **App Proxy** for the form page = served from our server under the merchant's own domain (`myshop.com/apps/withdrawal`), **server-side rendered → no inline JS → CSP-safe → SEO-safe → theme-agnostic.**
- This single architecture choice eliminates the 3 biggest reasons competitors get 1-star reviews.

---

## 6. Data model (initial)

```
Shop            { id, shopDomain, accessToken, plan, locale, installedAt, settings... }
Settings        { shopId, buttonMode(footer|floating), buttonLabel, formTexts(json),
                  withdrawalDays(14..30), excludedProducts(json), emailSender, branding(json) }
WithdrawalRequest { id, shopId, customerName, email, orderRef, itemsDescription,
                    locale, status(pending|processed|rejected), createdAt(UTC, precise),
                    confirmationSentAt, ip, userAgent }
AuditEvent      { id, requestId, type, payloadJson, createdAt }
```

---

## 7. Flows

**Merchant onboarding (wizard, plain language):**
1. Install → OAuth → shop created
2. Choose button style: footer link / floating button → enable App Embed
3. Set confirmation email sender + withdrawal window (default 14 days)
4. Pick language(s) → done. Live preview shown.

**Customer withdrawal:**
1. Sees "Withdraw from contract" button (no login)
2. Clicks → `/apps/withdrawal` page (proxy) → Step 1 form (name, order, email, description)
3. Step 2 "Confirm withdrawal" → submit
4. Gets confirmation email w/ timestamp; merchant sees request in dashboard

---

## 8. Internationalization
- 24 EU languages; legally-correct primary + confirm labels per language (DE: "Vertrag widerrufen" / "Widerruf bestätigen", etc.)
- Auto-detect from Shopify Markets / storefront locale; merchant override.

---

## 9. Deployment (on existing Coolify server — isolated)
- New Coolify **project** "Widero" (separate, like other isolated app projects) + its own Postgres DB.
- Dockerfile build, domain via subdomain (e.g. widero.onkra.online).
- **Existing 20+ projects untouched.**

---

## 10. Build phases (milestones)

- **Phase 0 — Setup:** Shopify Partner app, Remix scaffold, Coolify project + Postgres, OAuth working.
- **Phase 1 — Core (free, MVP):** App Embed button + App Proxy form + 2-step submit + DB save + confirmation email + basic dashboard. (This alone is legally functional.)
- **Phase 2 — Compliance polish:** audit log, PDF export, editable texts, 24 languages, withdrawal-window setting.
- **Phase 3 — Onboarding & UX:** setup wizard, live preview, plain-language UI, diagnostics page.
- **Phase 4 — Paid features:** Returns sync, custom SMTP, branding, Flow, stats, billing API.
- **Phase 5 — Launch:** Built-for-Shopify checks, listing copy (transparent pricing), disclaimer, submit for review.

---

## 11. Pricing
- **Free:** full legal core (above).
- **Pro ~$5–9/mo:** automation + branding + custom email + support.
- Transparent on listing and in-app before setup.

---

## 12. Risks & mitigations
- *Legal correctness* → follow Art. 11a checklist exactly; add "not legal advice" disclaimer.
- *Market saturates fast* → ship MVP quickly (Phase 1) to catch the current wave.
- *Theme variety* → App Proxy + App Embed sidesteps theme-specific breakage.
- *Email deliverability* → reputable transactional sender; SPF/DKIM on custom domains (paid).
- *Shopify review rejection* → no review-gating, clear pricing, performance budget for BFS badge.

---

## 13. Next step
Phase 0 + Phase 1 scaffold: create Partner app, Remix project, isolated Coolify project + Postgres, get OAuth + a "hello" App Proxy page live.
