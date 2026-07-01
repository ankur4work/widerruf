import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { unauthenticated } from "~/shopify.server";

// Temporary, guarded diagnostic to verify the managed-pricing URL resolves
// without an embedded session. Remove after verification.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== "widerruf-verify-9x7q") {
    return json({ error: "forbidden" }, { status: 403 });
  }
  const shop = url.searchParams.get("shop") || "";
  if (!shop) return json({ error: "missing shop" }, { status: 400 });

  try {
    const { admin } = await unauthenticated.admin(shop);
    const r = await admin.graphql(
      `#graphql
      query { currentAppInstallation { app { handle } } }`,
    );
    const d = await r.json();
    const handle = d?.data?.currentAppInstallation?.app?.handle || null;
    const store = shop.replace(".myshopify.com", "");
    return json({
      handle,
      pricingUrl: handle
        ? `https://admin.shopify.com/store/${store}/charges/${handle}/pricing_plans`
        : null,
    });
  } catch (e) {
    return json({ error: String(e) }, { status: 200 });
  }
};
