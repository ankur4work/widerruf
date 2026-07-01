import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

// Public app-proxy endpoint the storefront button uses to decide whether to
// show the "Powered by Widerruf" brand tag (hidden on Pro).
export async function loader({ request }: LoaderFunctionArgs) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=60, s-maxage=60",
  };
  try {
    const { session } = await authenticate.public.appProxy(request);
    const shop = session?.shop;
    if (!shop) return json({ pro: false }, { headers: cors });
    const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
    return json({ pro: sub?.plan === "PRO" }, { headers: cors });
  } catch {
    return json({ pro: false }, { headers: cors });
  }
}
