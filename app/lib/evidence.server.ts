/**
 * Builds withdrawal "evidence packs" (PDF) and CSV exports from stored records.
 * The PDF is a durable, self-contained legal record per Art. 11a CRD:
 * who withdrew, from what, when (precise UTC receipt time), and the full
 * append-only audit trail.
 */

import type { PdfBlock } from "./pdf.server";
import { reasonLabel } from "./i18n";

// Loose shape so callers can pass Prisma rows without importing the client type.
export interface EvidenceRequest {
  id: string;
  shop: string;
  customerName: string;
  email: string;
  orderRef: string | null;
  itemsDescription: string | null;
  reason: string | null;
  locale: string;
  status: string;
  confirmationSentAt: Date | null;
  orderCancelledAt: Date | null;
  refundedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface EvidenceAuditEvent {
  type: string;
  payloadJson: string | null;
  createdAt: Date;
}

const AUDIT_LABELS: Record<string, string> = {
  CREATED: "Request received",
  CONFIRMATION_SENT: "Confirmation email sent (durable medium)",
  STATUS_CHANGED: "Status changed",
  PDF_GENERATED: "Evidence pack generated",
  ORDER_CANCELLED: "Shopify order cancelled",
  REFUND_CREATED: "Refund created on Shopify order",
  EXPORTED: "Exported",
};

function utc(d: Date | null): string {
  return d ? d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC") : "—";
}

/** Blocks for a single-request evidence pack. */
export function buildEvidenceBlocks(
  req: EvidenceRequest,
  events: EvidenceAuditEvent[],
  storeName: string,
): PdfBlock[] {
  const blocks: PdfBlock[] = [
    { t: "title", text: "Withdrawal — Evidence Pack" },
    { t: "subtitle", text: `${storeName} · Record ID ${req.id}` },
    { t: "subtitle", text: "EU Directive 2023/2673 (Art. 11a CRD) withdrawal record" },
    { t: "divider" },

    { t: "heading", text: "Withdrawal details" },
    { t: "kv", label: "Received (UTC)", value: utc(req.createdAt) },
    { t: "kv", label: "Status", value: req.status },
    { t: "kv", label: "Customer name", value: req.customerName },
    { t: "kv", label: "Email", value: req.email },
    { t: "kv", label: "Order reference", value: req.orderRef || "—" },
    {
      t: "kv",
      label: "Items / services",
      value: req.itemsDescription || "—",
    },
  ];

  if (req.reason) {
    blocks.push({ t: "kv", label: "Stated reason", value: reasonLabel(req.reason, req.locale) });
  }
  blocks.push({ t: "kv", label: "Language", value: req.locale.toUpperCase() });

  blocks.push(
    { t: "heading", text: "Processing" },
    { t: "kv", label: "Confirmation email sent", value: utc(req.confirmationSentAt) },
    { t: "kv", label: "Order cancelled", value: utc(req.orderCancelledAt) },
    { t: "kv", label: "Refund created", value: utc(req.refundedAt) },
  );

  blocks.push({ t: "heading", text: "Audit trail" });
  if (events.length === 0) {
    blocks.push({ t: "para", muted: true, text: "No audit events recorded." });
  } else {
    for (const e of events) {
      const label = AUDIT_LABELS[e.type] || e.type;
      let detail = "";
      if (e.payloadJson) {
        try {
          const p = JSON.parse(e.payloadJson);
          if (p && typeof p === "object") {
            if (p.to) detail = ` → ${p.to}`;
            else if (p.orderName) detail = ` (${p.orderName})`;
          }
        } catch {
          /* ignore malformed payloads */
        }
      }
      blocks.push({ t: "para", text: `${utc(e.createdAt)}  —  ${label}${detail}` });
    }
  }

  blocks.push(
    { t: "divider" },
    { t: "kv", label: "Technical metadata", value: `IP ${req.ipAddress || "—"}` },
    { t: "para", muted: true, text: `User agent: ${req.userAgent || "—"}` },
    { t: "space", h: 8 },
    {
      t: "para",
      muted: true,
      text:
        "This document is an automatically generated record produced by the Widerruf app. " +
        "It is a software-generated evidence pack and does not constitute legal advice.",
    },
  );

  return blocks;
}

/** Blocks for a bulk pack: cover page + one section per request. */
export function buildBulkBlocks(
  requests: EvidenceRequest[],
  eventsByRequest: Map<string, EvidenceAuditEvent[]>,
  storeName: string,
): PdfBlock[] {
  const blocks: PdfBlock[] = [
    { t: "title", text: "Withdrawal — Bulk Evidence Pack" },
    { t: "subtitle", text: `${storeName}` },
    { t: "subtitle", text: `${requests.length} record(s) · generated ${utc(new Date(requests[0]?.createdAt ?? new Date()))}` },
    { t: "para", muted: true, text: "EU Directive 2023/2673 (Art. 11a CRD) withdrawal records." },
  ];
  for (const req of requests) {
    blocks.push({ t: "divider" });
    blocks.push(...buildEvidenceBlocks(req, eventsByRequest.get(req.id) ?? [], storeName).slice(3));
  }
  return blocks;
}

// --- CSV ---------------------------------------------------------------------

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADERS = [
  "id",
  "received_utc",
  "status",
  "customer_name",
  "email",
  "order_ref",
  "reason_code",
  "items",
  "locale",
  "confirmation_sent_utc",
  "order_cancelled_utc",
  "refund_created_utc",
] as const;

export function requestsToCsv(requests: EvidenceRequest[]): string {
  const rows = [CSV_HEADERS.join(",")];
  for (const r of requests) {
    rows.push(
      [
        r.id,
        r.createdAt.toISOString(),
        r.status,
        r.customerName,
        r.email,
        r.orderRef ?? "",
        r.reason ?? "",
        r.itemsDescription ?? "",
        r.locale,
        r.confirmationSentAt?.toISOString() ?? "",
        r.orderCancelledAt?.toISOString() ?? "",
        r.refundedAt?.toISOString() ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "﻿" + rows.join("\r\n"); // BOM for Excel UTF-8
}
