import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { renderPdf } from "~/lib/pdf.server";
import { buildEvidenceBlocks } from "~/lib/evidence.server";

/**
 * GET /app/requests/:id/pdf
 * Single-request evidence pack (PDF). Available on every plan — a durable legal
 * record is a compliance basic, not a paid perk.
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const id = params.id!;

  const [req, settings] = await Promise.all([
    prisma.withdrawalRequest.findFirst({
      where: { id, shop },
      include: { events: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.settings.findUnique({ where: { shop } }),
  ]);
  if (!req) throw new Response("Not found", { status: 404 });

  const storeName = settings?.senderName || shop;
  const pdf = renderPdf(buildEvidenceBlocks(req, req.events, storeName));

  // Record that a durable copy was produced (best-effort).
  await prisma.withdrawalRequest
    .update({ where: { id: req.id }, data: { pdfGeneratedAt: new Date() } })
    .catch(() => {});
  await prisma.auditEvent
    .create({ data: { requestId: req.id, type: "PDF_GENERATED" } })
    .catch(() => {});

  const safeName = `withdrawal-${req.id}.pdf`;
  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
};
