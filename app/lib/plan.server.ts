import prisma from "~/db.server";

/**
 * Testing override: shops listed in FORCE_PRO_SHOPS (comma-separated domains) are
 * always treated as Pro, regardless of billing. Use ONLY for dev stores — remove
 * before relying on real billing in production.
 */
function isForcedPro(shop: string): boolean {
  return (process.env.FORCE_PRO_SHOPS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(shop.toLowerCase());
}

/** True when the shop is on the paid Pro plan (reads the synced DB value). */
export async function isProShop(shop: string): Promise<boolean> {
  if (isForcedPro(shop)) return true;
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
  // Dev-store testing override — force Pro without billing.
  if (isForcedPro(shop)) {
    await prisma.shopSubscription
      .upsert({
        where: { shop },
        update: { plan: "PRO", status: "ACTIVE" },
        create: { shop, plan: "PRO" },
      })
      .catch(() => {});
    return "PRO";
  }

  let res: Response;
  try {
    res = await admin.graphql(`#graphql
      query CurrentPlan {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            test
            lineItems {
              plan {
                pricingDetails {
                  __typename
                  ... on AppRecurringPricing { price { amount currencyCode } }
                }
              }
            }
          }
        }
      }`);
  } catch (thrown: any) {
    // shopify-app-remix throws a Response (redirect/401) when the access token
    // needs re-auth — usually a stale token after a scope change (needs reinstall).
    if (thrown instanceof Response) {
      const loc = thrown.headers.get("location");
      const body = await thrown.clone().text().catch(() => "");
      console.error(
        `[syncPlan] graphql THREW Response status=${thrown.status} location=${loc} body=${body.slice(0, 250)}`,
      );
    } else {
      console.error(`[syncPlan] graphql threw (non-Response) shop=${shop}:`, thrown?.message || thrown);
    }
    const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
    return sub?.plan === "PRO" ? "PRO" : "FREE";
  }

  try {
    const data = (await res.json()) as any;
    const subs: any[] = data?.data?.currentAppInstallation?.activeSubscriptions ?? [];

    // A subscription is "Pro" if it is ACTIVE and priced above 0. Managed Pricing
    // free plans may also appear as ACTIVE subscriptions, so we can't treat any
    // active subscription as paid — we look at the recurring price.
    const priceOf = (s: any): number =>
      (s.lineItems ?? []).reduce((max: number, li: any) => {
        const amt = Number(li?.plan?.pricingDetails?.price?.amount ?? 0);
        return amt > max ? amt : max;
      }, 0);

    const activePaid = subs.find((s) => s.status === "ACTIVE" && priceOf(s) > 0);
    // Fallback: some setups name the paid plan "Pro" without exposing price here.
    const activeByName = subs.find(
      (s) => s.status === "ACTIVE" && /pro/i.test(String(s.name || "")),
    );
    const chosen = activePaid || activeByName;
    const plan = chosen ? "PRO" : "FREE";

    console.log(
      `[syncPlan] shop=${shop} -> ${plan} | subs=${JSON.stringify(
        subs.map((s) => ({ name: s.name, status: s.status, price: priceOf(s), test: s.test })),
      )}`,
    );

    await prisma.shopSubscription.upsert({
      where: { shop },
      update: {
        plan,
        status: chosen ? "ACTIVE" : "CANCELLED",
        subscriptionId: chosen?.id ?? null,
      },
      create: { shop, plan, subscriptionId: chosen?.id ?? null },
    });
    return plan;
  } catch (e) {
    console.error(`[syncPlan] failed for shop=${shop}:`, e);
    const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
    return sub?.plan === "PRO" ? "PRO" : "FREE";
  }
}
