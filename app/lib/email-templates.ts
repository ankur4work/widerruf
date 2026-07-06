/**
 * Editable decision-email templates (accept / reject).
 *
 * Pure + isomorphic (imported by both the Settings/dashboard UI and the server),
 * so no server-only imports here. Templates use simple {{placeholders}}:
 *   {{customer_name}} {{store_name}} {{reason}} {{order}}
 */

export type DecisionStatus = "PROCESSED" | "REJECTED";

export interface DecisionTemplate {
  subject: string;
  body: string;
}

const DEFAULTS: Record<string, Record<DecisionStatus, DecisionTemplate>> = {
  en: {
    PROCESSED: {
      subject: "Your withdrawal has been accepted — {{store_name}}",
      body:
        "Hello {{customer_name}},\n\n" +
        "Good news — your withdrawal request{{order}} has been accepted and is now being processed. " +
        "Any refund will follow according to our store policy.\n\n" +
        "{{reason}}\n\n" +
        "Kind regards,\n{{store_name}}",
    },
    REJECTED: {
      subject: "About your withdrawal request — {{store_name}}",
      body:
        "Hello {{customer_name}},\n\n" +
        "Thank you for your withdrawal request{{order}}. Unfortunately we are unable to accept it.\n\n" +
        "{{reason}}\n\n" +
        "If you have any questions, simply reply to this email.\n\n" +
        "Kind regards,\n{{store_name}}",
    },
  },
  de: {
    PROCESSED: {
      subject: "Ihr Widerruf wurde angenommen — {{store_name}}",
      body:
        "Hallo {{customer_name}},\n\n" +
        "Gute Nachrichten — Ihr Widerrufsantrag{{order}} wurde angenommen und wird nun bearbeitet. " +
        "Eine eventuelle Rückerstattung erfolgt gemäß unseren Bedingungen.\n\n" +
        "{{reason}}\n\n" +
        "Mit freundlichen Grüßen,\n{{store_name}}",
    },
    REJECTED: {
      subject: "Zu Ihrem Widerrufsantrag — {{store_name}}",
      body:
        "Hallo {{customer_name}},\n\n" +
        "Vielen Dank für Ihren Widerrufsantrag{{order}}. Leider können wir ihn nicht annehmen.\n\n" +
        "{{reason}}\n\n" +
        "Bei Fragen antworten Sie einfach auf diese E-Mail.\n\n" +
        "Mit freundlichen Grüßen,\n{{store_name}}",
    },
  },
};

/** The built-in default template for a status/locale (falls back to English). */
export function defaultDecisionTemplate(
  status: DecisionStatus,
  locale?: string | null,
): DecisionTemplate {
  const code = (locale || "en").toLowerCase().split("-")[0];
  return (DEFAULTS[code] || DEFAULTS.en)[status];
}

/** Replace {{placeholders}} and tidy up whitespace left by empty values. */
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  const replaced = tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    key in vars ? vars[key] : "",
  );
  // Collapse runs of blank lines an empty {{reason}}/{{order}} may leave behind.
  return replaced
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}

/**
 * Build the {{order}} fragment (" (order #1001)" or "") in the request's language.
 */
export function orderFragment(orderRef: string | null | undefined, locale?: string | null): string {
  if (!orderRef) return "";
  const code = (locale || "en").toLowerCase().split("-")[0];
  return code === "de" ? ` (Bestellung ${orderRef})` : ` (order ${orderRef})`;
}
