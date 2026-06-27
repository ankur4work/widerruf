import nodemailer from "nodemailer";
import { t } from "./i18n";

/**
 * Sends the legally-required withdrawal confirmation on a durable medium (email).
 * Must include the content of the declaration + the exact date/time of receipt.
 *
 * If SMTP is not configured, we log and return false (the request is still stored;
 * the merchant can resend). Never throw to the customer flow.
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

export interface ConfirmationInput {
  to: string;
  shop: string;
  locale: string;
  customerName: string;
  orderRef?: string | null;
  itemsDescription?: string | null;
  receivedAt: Date;
  from?: string | null;
}

export async function sendWithdrawalConfirmation(
  input: ConfirmationInput,
): Promise<boolean> {
  const tx = getTransporter();
  const strings = t(input.locale);
  const from =
    input.from ||
    process.env.SMTP_FROM ||
    "Withdrawal <no-reply@widerruf.onkra.online>";

  // ISO timestamp = unambiguous "date and time of receipt"
  const received = input.receivedAt.toISOString();

  const subject = `${strings.successTitle} — ${input.shop}`;
  const text = [
    `${strings.successTitle}`,
    "",
    `${strings.nameLabel}: ${input.customerName}`,
    input.orderRef ? `${strings.orderLabel}: ${input.orderRef}` : null,
    input.itemsDescription
      ? `${strings.itemsLabel}: ${input.itemsDescription}`
      : null,
    "",
    `Received at (UTC): ${received}`,
    "",
    strings.successMessage,
  ]
    .filter(Boolean)
    .join("\n");

  if (!tx) {
    console.warn(
      `[email] SMTP not configured — confirmation NOT sent for ${input.to}. Stored request remains valid.`,
    );
    return false;
  }

  try {
    await tx.sendMail({ from, to: input.to, subject, text });
    return true;
  } catch (error) {
    console.error("[email] Failed to send withdrawal confirmation:", error);
    return false;
  }
}
