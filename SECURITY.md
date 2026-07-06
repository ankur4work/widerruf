# Security & Data Protection Policy

**App:** Widerruf: EU Withdrawal Button
**Owner:** [COMPANY_NAME] — [SECURITY_CONTACT_EMAIL]
**Last updated:** 4 July 2026

This document describes how we protect merchant and customer personal data and how
we respond to security incidents. It backs the answers given in Shopify's Protected
Customer Data questionnaire.

> Replace the [BRACKETED] values before treating this as final.

---

## 1. Data we process

Minimal, purpose-bound data only:

- **Customer (via the withdrawal form):** name, email, order number, item/service
  description, optional reason, IP address, browser user-agent.
- **Order data (Shopify Admin API):** order number, contact email, fulfillment status;
  order cancellation and refunds when the merchant enables automation.
- **Merchant:** store domain, access token, app settings.

We do **not** collect phone numbers or addresses, and we do **not** sell data or use it
for marketing or advertising.

## 2. Data minimization & purpose limitation

- Only the fields above are collected, each tied to a stated purpose (recording/confirming
  a statutory withdrawal, matching/cancelling/refunding the order, anti-abuse).
- No secondary use. No profiling. No automated decisions with legal effect — every
  accept/reject decision is made manually by the merchant.

## 3. Encryption

- **In transit:** all traffic served over HTTPS/TLS.
- **At rest:** the database volume is encrypted at rest ([confirm: full-disk/volume
  encryption enabled on the host]).
- **Backups:** database backups are encrypted and access-controlled.

## 4. Access control

- Least privilege: only authorized operators can access production data.
- **2FA required** on the Shopify Partner account, server/SSH access, and the database.
- Strong, unique credentials managed via a password manager.
- The App requests only the scopes it needs: `read_orders`, `write_orders`.

## 5. Logging & monitoring

- The App maintains an append-only **audit log** (`AuditEvent`) of every action taken on a
  withdrawal record (created, confirmation sent, status changed, order cancelled, refund
  created, exported, decision email sent).
- Server and database access logs are retained for investigation.

## 6. Data retention & deletion

- Withdrawal records are retained while the merchant has the App installed and only as long
  as needed to evidence compliance.
- Deletion is honored via Shopify's mandatory privacy webhooks:
  - `customers/data_request` — locate and report a customer's data;
  - `customers/redact` — delete that customer's withdrawal records;
  - `shop/redact` — purge all data for the store (within 48h of uninstall).
- Ad-hoc deletion requests are handled via the security contact.

## 7. Data loss prevention

- Encrypted, access-controlled backups with periodic restore testing.
- Separation of test/development data (dev store + separate dev database) from production.
- Infrastructure-as-config so the environment can be rebuilt.

## 8. Incident response

If a security incident or personal-data breach is suspected:

1. **Detect & triage** — capture scope, affected data, and timeline.
2. **Contain** — revoke compromised credentials/tokens, isolate affected systems.
3. **Assess** — determine what data was affected and the risk to individuals.
4. **Notify** — notify Shopify and affected merchants without undue delay, and where
   required by law, the relevant supervisory authority **within 72 hours** of becoming
   aware, plus affected individuals where the risk is high.
5. **Remediate** — patch the root cause, rotate secrets, restore from clean backups.
6. **Review** — document a post-incident report and corrective actions.

**Security contact:** [SECURITY_CONTACT_EMAIL]

## 9. Third-party audits / certifications

None at this time.

## 10. Subprocessors

Application hosting provider, SMTP email delivery provider, DNS/CDN provider, and Shopify.
