import prisma from "~/db.server";

/** True when the shop is on the paid Pro plan (reads the synced DB value). */
export async function isProShop(shop: string): Promise<boolean> {
  const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
  return sub?.plan === "PRO";
}

type AdminLike = { graphql: (q: string, o?: any) => Promise<Response> };

/**
 * Ask Shopify directly whether the shop has an active app subscription and sync
 * the plan into our DB. This is the source of truth — the APP_SUBSCRIPTIONS_UPDATE
 * webhook is unreliable with Managed Pricing, so we don't depend on it. Any ACTIVE
 * subscription (incl. test subscriptions) counts as PRO. This query needs no
 * Protected Customer Data access.
 */
export async function syncPlanFromShopify(
  admin: AdminLike,
  shop: string,
): Promise<"FREE" | "PRO"> {
  try {
    const res = await admin.graphql(`#graphql
      query CurrentPlan {
        currentAppInstallation {
          activeSubscriptions { id name status test }
        }
      }`);
    const data = (await res.json()) as any;
    const subs = data?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    const active = subs.find((s: any) => s.status === "ACTIVE");
    const plan = active ? "PRO" : "FREE";
    await prisma.shopSubscription.upsert({
      where: { shop },
      update: {
        plan,
        status: active ? "ACTIVE" : "CANCELLED",
        subscriptionId: active?.id ?? null,
      },
      create: { shop, plan, subscriptionId: active?.id ?? null },
    });
    return plan;
  } catch (e) {
    console.error(`[syncPlan] failed for shop=${shop}:`, e);
    const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
    return sub?.plan === "PRO" ? "PRO" : "FREE";
  }
}
