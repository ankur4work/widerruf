import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { isProShop } from "~/lib/plan.server";
import { renderPdf } from "~/lib/pdf.server";
import {
  buildBulkBlocks,
  requestsToCsv,
  type EvidenceAuditEvent,
} from "~/lib/evidence.server";

/**
 * GET /app/export?format=csv|pdf&status=ALL|PENDING|PROCESSED|REJECTED
 * Bulk export of withdrawal records (Pro). CSV for spreadsheets, or a combined
 * multi-page PDF evidence pack.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (!(await isProShop(shop))) return redirect("/app/billing");

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const status = (url.searchParams.get("status") || "ALL").toUpperCase();
  const where =
    status === "PENDING" || status === "PROCESSED" || status === "REJECTED"
      ? { shop, status }
      : { shop };

  const requests = await prisma.withdrawalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = requestsToCsv(requests);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="withdrawals-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Combined PDF pack — attach each request's audit trail.
  const settings = await prisma.settings.findUnique({ where: { shop } });
  const storeName = settings?.senderName || shop;

  const ids = requests.map((r) => r.id);
  const events = await prisma.auditEvent.findMany({
    where: { requestId: { in: ids } },
    orderBy: { createdAt: "asc" },
  });
  const byRequest = new Map<string, EvidenceAuditEvent[]>();
  for (const e of events) {
    const arr = byRequest.get(e.requestId) ?? [];
    arr.push(e);
    byRequest.set(e.requestId, arr);
  }

  const pdf = renderPdf(buildBulkBlocks(requests, byRequest, storeName));
  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="withdrawals-pack-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
};
