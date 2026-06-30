import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
      }
      break;

    case "APP_SUBSCRIPTIONS_UPDATE":
      // Billing status changes handled in Phase 4.
      break;

    // ---- GDPR / mandatory compliance webhooks (required for App Store) ----

    // Customer asks what data we hold. We store withdrawal requests by email;
    // log them so the merchant can fulfil the request.
    case "CUSTOMERS_DATA_REQUEST": {
      const email = (payload as any)?.customer?.email;
      if (email) {
        const records = await prisma.withdrawalRequest.findMany({
          where: { shop, email },
        });
        console.log(
          `[gdpr] data_request shop=${shop} email=${email} records=${records.length}`,
        );
      }
      break;
    }

    // Customer asks to be deleted -> remove their withdrawal records (audit
    // events cascade-delete).
    case "CUSTOMERS_REDACT": {
      const email = (payload as any)?.customer?.email;
      if (email) {
        await prisma.withdrawalRequest.deleteMany({ where: { shop, email } });
        console.log(`[gdpr] customers_redact shop=${shop} email=${email}`);
      }
      break;
    }

    // Store uninstalled (48h later) -> purge everything we hold for the shop.
    case "SHOP_REDACT": {
      await prisma.withdrawalRequest.deleteMany({ where: { shop } });
      await prisma.settings.deleteMany({ where: { shop } });
      await prisma.shopSubscription.deleteMany({ where: { shop } });
      await prisma.session.deleteMany({ where: { shop } });
      console.log(`[gdpr] shop_redact purged all data shop=${shop}`);
      break;
    }

    default:
      break;
  }

  return new Response(null, { status: 200 });
};
