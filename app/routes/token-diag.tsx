import { json, type LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";

/**
 * TEMPORARY diagnostic: confirms whether stored offline tokens are EXPIRING
 * (Shopify's 2027-01-01 requirement). Returns only session METADATA — never the
 * access token itself. Gated by a secret key. Remove after verification.
 */
const KEY = "wid_diag_7fkq29";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== KEY) {
    return json({ error: "forbidden" }, { status: 403 });
  }
  const sessions = await prisma.session.findMany();
  const now = Date.now();
  return json({
    now: new Date(now).toISOString(),
    count: sessions.length,
    sessions: sessions.map((s) => ({
      shop: s.shop,
      isOnline: s.isOnline,
      scope: s.scope,
      hasToken: Boolean(s.accessToken),
      expires: s.expires ? s.expires.toISOString() : null,
      expiring: s.expires != null,
      minutesUntilExpiry: s.expires
        ? Math.round((s.expires.getTime() - now) / 60000)
        : null,
    })),
  });
};
