import nodemailer from "nodemailer";
import { t } from "./i18n";

/**
 * Withdrawal emails (durable-medium proof + outcome notifications).
 *
 * Sender presentation:
 *  - FREE: sent from our shared address but with the merchant's STORE NAME as the
 *    display name + the merchant's Reply-To, so the customer sees the store, not us.
 *  - PRO:  merchant supplies a fully custom From (their own verified domain).
 *
 * If SMTP is not configured we log and return false (request stays valid).
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

const SENDER_ADDRESS =
  process.env.SMTP_FROM_ADDRESS || "no-reply@widerruf.onkra.online";

/** Build the From header. PRO custom From wins; otherwise store-name display. */
function buildFrom(fromName?: string | null, customFrom?: string | null): string {
  if (customFrom) return customFrom;
  const name = (fromName || "Withdrawals").replace(/[<>"\r\n]/g, "").trim();
  return `${name} <${SENDER_ADDRESS}>`;
}

interface BaseInput {
  to: string;
  shop: string;
  locale: string;
  customerName: string;
  fromName?: string | null; // store display name (FREE)
  replyTo?: string | null; // merchant reply-to
  customFrom?: string | null; // full custom From (PRO)
  accent?: string | null; // brand accent color for the email
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Branded, email-client-safe HTML shell (inline styles only). */
function htmlShell(opts: {
  accent: string;
  storeName: string;
  heading: string;
  bodyHtml: string;
}): string {
  const a = opts.accent || "#2563EB";
  return `<div style="background:#f4f5f7;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #ececf1;border-radius:12px;overflow:hidden;">
    <div style="background:${a};padding:16px 24px;color:#ffffff;font-size:16px;font-weight:600;">${esc(opts.storeName)}</div>
    <div style="padding:24px;color:#2a2a38;">
      <h1 style="font-size:18px;margin:0 0 12px;">${esc(opts.heading)}</h1>
      ${opts.bodyHtml}
    </div>
    <div style="padding:14px 24px;background:#fafafb;border-top:1px solid #f0f0f4;font-size:11px;color:#aaaab4;">
      Automated message from ${esc(opts.storeName)} · EU Directive 2023/2673 withdrawal function.
    </div>
  </div>
</div>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;font-size:12px;color:#8a8a98;width:38%;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;font-size:14px;color:#2a2a38;">${esc(value)}</td></tr>`;
}

export interface ConfirmationInput extends BaseInput {
  orderRef?: string | null;
  itemsDescription?: string | null;
  receivedAt: Date;
}

async function send(opts: {
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(
      `[email] SMTP not configured — NOT sent to ${opts.to}. (Data is still stored.)`,
    );
    return false;
  }
  try {
    await tx.sendMail({
      from: opts.from,
      to: opts.to,
      replyTo: opts.replyTo || undefined,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return true;
  } catch (error) {
    console.error("[email] send failed:", error);
    return false;
  }
}

/** Receipt confirmation (legally required durable medium, with timestamp). */
export async function sendWithdrawalConfirmation(
  input: ConfirmationInput,
): Promise<boolean> {
  const s = t(input.locale);
  const storeName = input.fromName || input.shop;
  const received = input.receivedAt.toISOString();

  const text = [
    s.successTitle,
    "",
    `${s.nameLabel}: ${input.customerName}`,
    input.orderRef ? `${s.orderLabel}: ${input.orderRef}` : null,
    input.itemsDescription ? `${s.itemsLabel}: ${input.itemsDescription}` : null,
    "",
    `Received at (UTC): ${received}`,
    "",
    s.successMessage,
    "",
    `— ${storeName}`,
  ]
    .filter(Boolean)
    .join("\n");

  const detailRows = [
    row(s.nameLabel, input.customerName),
    input.orderRef ? row(s.orderLabel, input.orderRef) : "",
    input.itemsDescription ? row(s.itemsLabel, input.itemsDescription) : "",
    row("Received (UTC)", received),
  ].join("");
  const html = htmlShell({
    accent: input.accent || "#2563EB",
    storeName,
    heading: s.successTitle,
    bodyHtml: `<p style="font-size:14px;line-height:1.6;color:#5b5b6b;margin:0 0 16px;">${esc(s.successMessage)}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #f0f0f4;margin-top:8px;">${detailRows}</table>`,
  });

  return send({
    from: buildFrom(input.fromName, input.customFrom),
    to: input.to,
    replyTo: input.replyTo,
    subject: `${s.successTitle} — ${storeName}`,
    text,
    html,
  });
}

const OUTCOME_TEXT: Record<string, { processed: string; rejected: string }> = {
  en: {
    processed:
      "Your withdrawal has been accepted and is now being processed. Any refund will follow according to the store's policy.",
    rejected:
      "Your withdrawal request could not be accepted. Please reply to this email if you have any questions.",
  },
  de: {
    processed:
      "Ihr Widerruf wurde angenommen und wird nun bearbeitet. Eine eventuelle Rückerstattung erfolgt gemäß den Bedingungen des Shops.",
    rejected:
      "Ihr Widerruf konnte nicht angenommen werden. Bitte antworten Sie auf diese E-Mail, falls Sie Fragen haben.",
  },
};

/** Notifies the customer of the merchant's decision (processed / rejected). */
export async function sendOutcomeNotification(
  input: BaseInput & { status: "PROCESSED" | "REJECTED" },
): Promise<boolean> {
  const s = t(input.locale);
  const storeName = input.fromName || input.shop;
  const lang = OUTCOME_TEXT[input.locale.toLowerCase().split("-")[0]] || OUTCOME_TEXT.en;
  const body = input.status === "PROCESSED" ? lang.processed : lang.rejected;
  const heading =
    input.status === "PROCESSED" ? s.successTitle : "Withdrawal update";

  const text = [
    heading,
    "",
    `${s.nameLabel}: ${input.customerName}`,
    "",
    body,
    "",
    `— ${storeName}`,
  ].join("\n");

  const html = htmlShell({
    accent: input.accent || "#2563EB",
    storeName,
    heading,
    bodyHtml: `<p style="font-size:14px;line-height:1.6;color:#5b5b6b;margin:0;">${esc(body)}</p>`,
  });

  return send({
    from: buildFrom(input.fromName, input.customFrom),
    to: input.to,
    replyTo: input.replyTo,
    subject: `${heading} — ${storeName}`,
    text,
    html,
  });
}
