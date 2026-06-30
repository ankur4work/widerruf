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
  :root { --accent: ${esc(accent)}; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; background: #f6f6f7; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #fff; border: 1px solid #e3e3e3; border-radius: 12px; padding: 28px; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  p.intro { color: #555; margin: 0 0 20px; font-size: 14px; line-height: 1.5; }
  label { display: block; font-weight: 600; font-size: 13px; margin: 16px 0 6px; }
  .help { font-weight: 400; color: #777; font-size: 12px; margin: 4px 0 0; }
  input, textarea { width: 100%; padding: 10px 12px; border: 1px solid #c9c9c9; border-radius: 8px; font-size: 14px; font-family: inherit; }
  textarea { min-height: 80px; resize: vertical; }
  .err { color: #b00020; font-size: 13px; margin: 6px 0 0; }
  .btn { display: inline-block; background: var(--accent); color: #fff; border: 0; border-radius: 8px; padding: 12px 18px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 22px; }
  .btn.secondary { background: #fff; color: #1a1a1a; border: 1px solid #c9c9c9; margin-right: 8px; }
  .row { margin-top: 18px; }
  dl { margin: 0; }
  dt { font-weight: 600; font-size: 12px; color: #777; margin-top: 12px; }
  dd { margin: 2px 0 0; font-size: 15px; }
  .success { text-align: center; }
  .success .tick { font-size: 40px; }
  .legal { color: #999; font-size: 11px; margin-top: 18px; text-align: center; }
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

// Anti-abuse limits (free, no external service)
const MAX_PER_IP_PER_HOUR = 5;
const MAX_PER_EMAIL_PER_DAY = 3;

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
