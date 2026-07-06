import type { LoaderFunctionArgs } from "@remix-run/node";

/**
 * Public privacy policy for the Widerruf app.
 *   URL: https://<app-domain>/privacy
 * Rendered as a self-contained HTML page (no Shopify auth, no Polaris) so it is
 * publicly reachable for the App Store listing + Protected Customer Data review.
 *
 * NOTE: replace the [BRACKETED] operator details before publishing.
 */

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@widerruf.onkra.online";
const APP_DOMAIN = process.env.SHOPIFY_APP_URL?.replace(/^https?:\/\//, "") || "widerruf.onkra.online";
const EFFECTIVE_DATE = "4 July 2026";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const loader = async (_args: LoaderFunctionArgs) => {
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — Widerruf: EU Withdrawal Button</title>
<style>
  :root { --ink:#1b1b2b; --muted:#5b5b6b; --accent:#2563EB; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--ink); margin:0; background:#f7f8fa; line-height:1.6; }
  .wrap { max-width:760px; margin:0 auto; padding:48px 20px 80px; }
  .card { background:#fff; border:1px solid #ececf1; border-radius:14px; padding:40px; box-shadow:0 6px 28px rgba(20,20,45,.06); }
  h1 { font-size:28px; margin:0 0 6px; letter-spacing:-.01em; }
  .sub { color:var(--muted); margin:0 0 28px; font-size:14px; }
  h2 { font-size:18px; margin:32px 0 10px; }
  h3 { font-size:15px; margin:20px 0 6px; }
  p, li { color:#2a2a38; font-size:15px; }
  ul { padding-left:20px; }
  a { color:var(--accent); }
  code { background:#f2f2f6; padding:1px 5px; border-radius:5px; font-size:13px; }
  table { width:100%; border-collapse:collapse; margin:12px 0; font-size:14px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #eceef3; vertical-align:top; }
  th { color:var(--muted); font-weight:600; }
  .note { background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; padding:12px 14px; border-radius:10px; font-size:13px; margin:0 0 24px; }
  footer { text-align:center; color:#9a9aa6; font-size:12px; margin-top:24px; }
</style>
</head>
<body>
<div class="wrap"><div class="card">
  <h1>Privacy Policy</h1>
  <p class="sub">Widerruf: EU Withdrawal Button &middot; Last updated ${EFFECTIVE_DATE}</p>

  <div class="note">Operator to complete before publishing: replace <code>[COMPANY_NAME]</code>,
  <code>[COMPANY_ADDRESS]</code>, and <code>[COUNTRY]</code> below with your legal details.</div>

  <p>This Privacy Policy explains how <strong>[COMPANY_NAME]</strong> ("we", "us", "the operator")
  handles personal data when a merchant installs the <strong>Widerruf: EU Withdrawal Button</strong>
  app (the "App") on their Shopify store, and when a customer of that store uses the withdrawal
  form the App provides.</p>

  <p>For a store's customers, the merchant (the store owner) is the <em>data controller</em> and we
  act as a <em>data processor</em> on the merchant's behalf. We only process personal data to
  provide the App's functionality described below.</p>

  <h2>1. Who we are</h2>
  <p>The App is operated by [COMPANY_NAME], [COMPANY_ADDRESS], [COUNTRY].
  Contact: <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>.</p>

  <h2>2. What data we process, and why</h2>
  <p>We deliberately collect the minimum data needed to record and confirm an EU right-of-withdrawal
  request (EU Directive 2023/2673, Art. 11a CRD) and to act on it for the merchant.</p>

  <h3>Data submitted by a store's customer via the withdrawal form</h3>
  <table>
    <tr><th>Data</th><th>Purpose</th></tr>
    <tr><td>Name</td><td>Legally required content of the withdrawal declaration; identifies the request.</td></tr>
    <tr><td>Email address</td><td>To send the customer a durable-medium confirmation and the merchant's accept/reject decision; to match the request to the correct order.</td></tr>
    <tr><td>Order number (optional)</td><td>To link the withdrawal to the correct Shopify order.</td></tr>
    <tr><td>Item / service description &amp; optional reason</td><td>To record what is being withdrawn and (in aggregate) to show the merchant withdrawal insights.</td></tr>
    <tr><td>IP address &amp; browser user-agent</td><td>Security and audit metadata proving when and from where the request was received; anti-abuse.</td></tr>
  </table>

  <h3>Order data accessed from the Shopify store (on the merchant's behalf)</h3>
  <p>To validate and act on a withdrawal, the App reads limited order data (order number, contact
  email, fulfillment status) and, where the merchant enables it, cancels the order and issues a
  refund through Shopify's API. We access order/customer data only for these purposes and do not
  use it for profiling, advertising, or any unrelated purpose.</p>

  <h3>Merchant account data</h3>
  <p>When a merchant installs the App we store the store domain, an access token, and app settings
  needed to run the App.</p>

  <h2>3. Legal bases (GDPR)</h2>
  <ul>
    <li><strong>Legal obligation / legitimate interests</strong> — recording and confirming a
    statutory withdrawal request and keeping the required audit record.</li>
    <li><strong>Consent / the customer's own action</strong> — the customer voluntarily submits the
    form to exercise their withdrawal right; we process only what they provide.</li>
    <li><strong>Contract</strong> — providing the App's service to the merchant.</li>
  </ul>

  <h2>4. What we do <em>not</em> do</h2>
  <ul>
    <li>We do <strong>not</strong> sell personal data.</li>
    <li>We do <strong>not</strong> use personal data for marketing or advertising.</li>
    <li>We do <strong>not</strong> make automated decisions with legal effect — every accept/reject
    decision is made manually by the merchant.</li>
  </ul>

  <h2>5. Sharing &amp; subprocessors</h2>
  <p>We share personal data only with the service providers needed to run the App:</p>
  <table>
    <tr><th>Subprocessor</th><th>Purpose</th></tr>
    <tr><td>Application hosting provider</td><td>Runs the App server and database.</td></tr>
    <tr><td>Email delivery (SMTP) provider</td><td>Sends confirmation and decision emails to customers.</td></tr>
    <tr><td>Content-delivery / DNS provider</td><td>Serves the App securely over HTTPS.</td></tr>
    <tr><td>Shopify</td><td>The platform the merchant's store runs on.</td></tr>
  </table>

  <h2>6. Storage, security &amp; location</h2>
  <ul>
    <li>Data is encrypted in transit (HTTPS/TLS) and at rest.</li>
    <li>Access to the database is restricted to authorized operators using strong authentication.</li>
    <li>We keep an append-only audit log of actions taken on each withdrawal record.</li>
    <li>Data is hosted in [COUNTRY]. Where data is transferred internationally, we rely on
    appropriate safeguards (e.g. EU Standard Contractual Clauses).</li>
  </ul>

  <h2>7. Retention &amp; deletion</h2>
  <p>We retain a withdrawal record while the merchant has the App installed and for as long as
  needed to evidence compliance. We delete data:</p>
  <ul>
    <li>on a verified customer erasure request, via Shopify's <code>customers/redact</code> webhook;</li>
    <li>for the whole store within 48 hours of uninstall, via Shopify's <code>shop/redact</code> webhook;</li>
    <li>on request to the contact address above.</li>
  </ul>

  <h2>8. Your rights</h2>
  <p>Depending on your jurisdiction you may have the right to access, correct, delete, restrict, or
  port your personal data, and to object to processing. As we act on the merchant's behalf, please
  contact the store first; you may also contact us at
  <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a> and we will assist the merchant in
  fulfilling the request. You may also lodge a complaint with your local data protection authority.</p>

  <h2>9. Children</h2>
  <p>The App is not directed to children and we do not knowingly process children's data.</p>

  <h2>10. Changes</h2>
  <p>We may update this policy; the "last updated" date above reflects the current version. Material
  changes will be communicated to merchants.</p>

  <h2>11. Contact</h2>
  <p>[COMPANY_NAME], [COMPANY_ADDRESS], [COUNTRY] &middot;
  <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a></p>

  <footer>${esc(APP_DOMAIN)} &middot; This document is provided for transparency and is not legal advice.</footer>
</div></div>
</body>
</html>`;

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
