import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { t, normalizeLocale, type Strings } from "~/lib/i18n";
import { sendWithdrawalConfirmation } from "~/lib/email.server";

/**
 * App Proxy: GET/POST https://<shop>/apps/withdrawal
 *
 * Fully server-side rendered, multi-step, NO client JavaScript:
 *   - Step 1: collect name, email, order, items  (GET renders this)
 *   - Step 2: review + "Confirm withdrawal"      (POST step=review)
 *   - Done:   store + email + success page        (POST step=confirm)
 *
 * This design avoids inline-JS / CSP breakage and never modifies the theme.
 */

interface FormValues {
  customerName: string;
  email: string;
  orderRef: string;
  items: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function page(inner: string, accent: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Withdrawal</title>
<style>
  :root { --accent: ${esc(accent)}; --radius: 14px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1b1b2b; margin: 0; background: linear-gradient(180deg,#f7f8fa 0%,#eceff5 100%); min-height: 100vh; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 520px; margin: 0 auto; padding: 44px 20px; animation: rise .35s ease both; }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .card { background: #fff; border: 1px solid #ececf1; border-radius: var(--radius); padding: 32px; box-shadow: 0 6px 28px rgba(20,20,45,.07); }
  .step { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); margin: 0 0 8px; }
  h1 { font-size: 23px; line-height: 1.2; margin: 0 0 10px; letter-spacing: -.01em; }
  p.intro { color: #5b5b6b; margin: 0 0 22px; font-size: 14px; line-height: 1.55; }
  label { display: block; font-weight: 600; font-size: 13px; margin: 18px 0 7px; color: #2a2a38; }
  .help { font-weight: 400; color: #8a8a98; font-size: 12px; margin: 5px 0 0; }
  input, textarea { width: 100%; padding: 11px 13px; border: 1px solid #d7d7e0; border-radius: 10px; font-size: 15px; font-family: inherit; background: #fff; transition: border-color .15s ease, box-shadow .15s ease; }
  input:focus, textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
  textarea { min-height: 92px; resize: vertical; }
  .err { color: #d72c4d; font-size: 13px; margin: 6px 0 0; }
  .btn { display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; border: 0; border-radius: 10px; padding: 12px 20px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 24px; box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent); transition: transform .08s ease, filter .15s ease, box-shadow .15s ease; }
  .btn:hover { filter: brightness(1.07); box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 45%, transparent); }
  .btn:active { transform: translateY(1px); }
  .btn.secondary { background: #fff; color: #2a2a38; border: 1px solid #d7d7e0; box-shadow: none; margin-right: 10px; }
  .btn.secondary:hover { background: #f6f6f9; filter: none; box-shadow: none; }
  .row { margin-top: 24px; display: flex; align-items: center; }
  dl { margin: 0; border: 1px solid #ececf1; border-radius: 12px; overflow: hidden; }
  dt { font-weight: 600; font-size: 11px; letter-spacing: .03em; text-transform: uppercase; color: #8a8a98; padding: 12px 14px 0; }
  dd { margin: 3px 0 0; font-size: 15px; color: #2a2a38; padding: 0 14px 12px; border-bottom: 1px solid #f2f2f6; word-break: break-word; }
  dd:last-child { border-bottom: 0; }
  .success { text-align: center; padding: 10px 0; }
  .tick { width: 64px; height: 64px; border-radius: 50%; background: #eef2ff; background: color-mix(in srgb, var(--accent) 14%, #fff); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 34px; margin: 4px auto 18px; animation: pop .4s cubic-bezier(.2,.9,.3,1.3) both; }
  @keyframes pop { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .legal { color: #9a9aa6; font-size: 11px; margin-top: 18px; text-align: center; }
  @media (max-width: 560px) { .wrap { padding: 28px 14px; } .card { padding: 22px; } h1 { font-size: 20px; } }
</style>
</head>
<body>
  <div class="wrap"><div class="card">${inner}</div>
  <p class="legal">Powered by Widerruf — EU Directive 2023/2673 withdrawal function.</p>
  </div>
</body>
</html>`;
}

function renderStep1(
  s: Strings,
  accent: string,
  values: Partial<FormValues> = {},
  errors: Record<string, string> = {},
  custom: { title?: string | null; intro?: string | null; itemsLabel?: string | null; itemsHelp?: string | null; excludedNote?: string | null } = {},
): string {
  const inner = `
  <p class="step">Step 1 of 2</p>
  <h1>${esc(custom.title || s.formTitle)}</h1>
  <p class="intro">${esc(custom.intro || s.intro)}</p>
  <form method="post">
    <input type="hidden" name="step" value="review">
    <label>${esc(s.nameLabel)}
      <input type="text" name="customerName" value="${esc(values.customerName || "")}" required>
    </label>
    ${errors.customerName ? `<p class="err">${esc(errors.customerName)}</p>` : ""}
    <label>${esc(s.emailLabel)}
      <input type="email" name="email" value="${esc(values.email || "")}" required>
    </label>
    ${errors.email ? `<p class="err">${esc(errors.email)}</p>` : ""}
    <label>${esc(s.orderLabel)}
      <input type="text" name="orderRef" value="${esc(values.orderRef || "")}">
    </label>
    <label>${esc(custom.itemsLabel || s.itemsLabel)}
      <textarea name="items" required>${esc(values.items || "")}</textarea>
      <span class="help">${esc(custom.itemsHelp || s.itemsHelp)}</span>
    </label>
    ${errors.items ? `<p class="err">${esc(errors.items)}</p>` : ""}
    ${custom.excludedNote ? `<p class="help" style="margin-top:14px">${esc(custom.excludedNote)}</p>` : ""}
    <input type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true" value="" style="position:absolute!important;left:-9999px!important;top:-9999px!important;height:1px;width:1px;opacity:0;pointer-events:none">
    <button class="btn" type="submit">${esc(s.continueButton)}</button>
  </form>`;
  return page(inner, accent);
}

function renderStep2(s: Strings, accent: string, v: FormValues): string {
  const hidden = (name: string, val: string) =>
    `<input type="hidden" name="${name}" value="${esc(val)}">`;
  const inner = `
  <p class="step">Step 2 of 2</p>
  <h1>${esc(s.reviewTitle)}</h1>
  <p class="intro">${esc(s.reviewHint)}</p>
  <dl>
    <dt>${esc(s.nameLabel)}</dt><dd>${esc(v.customerName)}</dd>
    <dt>${esc(s.emailLabel)}</dt><dd>${esc(v.email)}</dd>
    ${v.orderRef ? `<dt>${esc(s.orderLabel)}</dt><dd>${esc(v.orderRef)}</dd>` : ""}
    <dt>${esc(s.itemsLabel)}</dt><dd>${esc(v.items)}</dd>
  </dl>
  <form method="post">
    <input type="hidden" name="step" value="confirm">
    ${hidden("customerName", v.customerName)}
    ${hidden("email", v.email)}
    ${hidden("orderRef", v.orderRef)}
    ${hidden("items", v.items)}
    <input type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true" value="" style="position:absolute!important;left:-9999px!important;top:-9999px!important;height:1px;width:1px;opacity:0;pointer-events:none">
    <div class="row">
      <button class="btn secondary" type="submit" name="step" value="back">${esc(s.backButton)}</button>
      <button class="btn" type="submit">${esc(s.confirmButton)}</button>
    </div>
  </form>`;
  return page(inner, accent);
}

function renderSuccess(s: Strings, accent: string): string {
  const inner = `
  <div class="success">
    <div class="tick">✓</div>
    <h1>${esc(s.successTitle)}</h1>
    <p class="intro">${esc(s.successMessage)}</p>
  </div>`;
  return page(inner, accent);
}

function renderTooMany(accent: string): string {
  const inner = `
  <div class="success">
    <h1>Too many requests</h1>
    <p class="intro">You have submitted several requests recently. Please wait a little while before trying again, or contact the store directly.</p>
  </div>`;
  return page(inner, accent);
}

// Anti-abuse limits (free, no external service). Generous enough for real
// customers + testing; the honeypot is the primary bot defense.
const MAX_PER_IP_PER_HOUR = 10;
const MAX_PER_EMAIL_PER_DAY = 10;

async function getContext(request: Request) {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop;
  if (!shop) return null;

  const url = new URL(request.url);
  const settings = await prisma.settings.findUnique({ where: { shop } });
  const locale = normalizeLocale(
    url.searchParams.get("locale") || settings?.defaultLocale || "en",
  );
  return { shop, settings, locale, strings: t(locale), accent: settings?.accentColor || "#2563EB" };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await getContext(request);
  if (!ctx) return html("Unauthorized", 401);
  return html(
    renderStep1(ctx.strings, ctx.accent, {}, {}, {
      title: ctx.settings?.formTitle,
      intro: ctx.settings?.formIntro,
      itemsLabel: ctx.settings?.itemsFieldLabel,
      itemsHelp: ctx.settings?.itemsFieldHelp,
      excludedNote: ctx.settings?.excludedNote,
    }),
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await getContext(request);
  if (!ctx) return html("Unauthorized", 401);
  const { shop, locale, strings, accent } = ctx;

  const form = await request.formData();
  const step = String(form.get("step") || "");
  const values: FormValues = {
    customerName: String(form.get("customerName") || "").trim(),
    email: String(form.get("email") || "").trim(),
    orderRef: String(form.get("orderRef") || "").trim(),
    items: String(form.get("items") || "").trim(),
  };

  const customText = {
    title: ctx.settings?.formTitle,
    intro: ctx.settings?.formIntro,
    itemsLabel: ctx.settings?.itemsFieldLabel,
    itemsHelp: ctx.settings?.itemsFieldHelp,
    excludedNote: ctx.settings?.excludedNote,
  };

  // Honeypot: a hidden field real users never fill. If a bot filled it, pretend
  // success and store nothing.
  const honeypot = String(form.get("company_url") || "").trim();
  if (honeypot && (step === "review" || step === "confirm")) {
    return html(renderSuccess(strings, accent));
  }

  // "Back" button returns to step 1 with values preserved
  if (step === "back") {
    return html(renderStep1(strings, accent, values, {}, customText));
  }

  // Validate before moving forward
  const errors: Record<string, string> = {};
  if (!values.customerName) errors.customerName = strings.required;
  if (!values.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email))
    errors.email = values.email ? strings.invalidEmail : strings.required;
  if (!values.items) errors.items = strings.required;

  if (Object.keys(errors).length > 0) {
    return html(renderStep1(strings, accent, values, errors, customText));
  }

  if (step === "review") {
    return html(renderStep2(strings, accent, values));
  }

  if (step === "confirm") {
    const receivedAt = new Date();
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = request.headers.get("user-agent") || null;

    // --- Anti-abuse checks (before we store / email) ---
    const since1h = new Date(receivedAt.getTime() - 60 * 60 * 1000);
    const since24h = new Date(receivedAt.getTime() - 24 * 60 * 60 * 1000);

    if (ipAddress) {
      const ipCount = await prisma.withdrawalRequest.count({
        where: { shop, ipAddress, createdAt: { gte: since1h } },
      });
      if (ipCount >= MAX_PER_IP_PER_HOUR) return html(renderTooMany(accent));
    }

    const emailCount = await prisma.withdrawalRequest.count({
      where: { shop, email: values.email, createdAt: { gte: since24h } },
    });
    if (emailCount >= MAX_PER_EMAIL_PER_DAY) return html(renderTooMany(accent));

    // Duplicate: same email + order already pending in last 24h -> idempotent.
    const duplicate = await prisma.withdrawalRequest.findFirst({
      where: {
        shop,
        email: values.email,
        orderRef: values.orderRef || null,
        status: "PENDING",
        createdAt: { gte: since24h },
      },
    });
    if (duplicate) return html(renderSuccess(strings, accent));

    const record = await prisma.withdrawalRequest.create({
      data: {
        shop,
        customerName: values.customerName,
        email: values.email,
        orderRef: values.orderRef || null,
        itemsDescription: values.items,
        locale,
        status: "PENDING",
        ipAddress,
        userAgent,
        createdAt: receivedAt,
      },
    });
    await prisma.auditEvent.create({
      data: {
        requestId: record.id,
        type: "CREATED",
        payloadJson: JSON.stringify({ ...values, receivedAt: receivedAt.toISOString() }),
      },
    });

    // Durable-medium confirmation (best-effort; request is valid regardless)
    const sent = await sendWithdrawalConfirmation({
      to: values.email,
      shop,
      locale,
      customerName: values.customerName,
      orderRef: values.orderRef,
      itemsDescription: values.items,
      receivedAt,
      fromName: ctx.settings?.senderName,
      replyTo: ctx.settings?.emailReplyTo,
      customFrom: ctx.settings?.emailFrom,
      accent: ctx.accent,
    });
    if (sent) {
      await prisma.withdrawalRequest.update({
        where: { id: record.id },
        data: { confirmationSentAt: new Date() },
      });
      await prisma.auditEvent.create({
        data: { requestId: record.id, type: "CONFIRMATION_SENT" },
      });
    }

    return html(renderSuccess(strings, accent));
  }

  // Unknown step → restart
  return html(renderStep1(strings, accent, {}, {}, customText));
}
