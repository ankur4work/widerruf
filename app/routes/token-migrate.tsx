import { json, type LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";

/**
 * TEMPORARY one-shot migration: converts legacy NON-expiring offline access tokens
 * into EXPIRING ones server-side (no merchant login needed), by exchanging the
 * stored offline token with `expiring=1` — the same call the library's
 * migrateToExpiringToken performs. Gated by a secret key. Remove after running.
 *
 * This is Shopify's supported, one-time, irreversible migration per shop.
 */
const KEY = "wid_diag_7fkq29";

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
const OFFLINE_TOKEN_TYPE =
  "urn:shopify:params:oauth:token-type:offline-access-token";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== KEY) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const apiSecret = process.env.SHOPIFY_API_SECRET || "";

  const legacy = await prisma.session.findMany({
    where: { isOnline: false, expires: null },
  });

  const results: Array<Record<string, unknown>> = [];

  for (const s of legacy) {
    if (!s.accessToken) {
      results.push({ shop: s.shop, ok: false, reason: "no stored token" });
      continue;
    }
    try {
      const res = await fetch(`https://${s.shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: apiKey,
          client_secret: apiSecret,
          grant_type: GRANT_TYPE,
          subject_token: s.accessToken,
          subject_token_type: OFFLINE_TOKEN_TYPE,
          requested_token_type: OFFLINE_TOKEN_TYPE,
          expiring: "1",
        }),
      });
      const bodyText = await res.text();
      if (!res.ok) {
        results.push({ shop: s.shop, ok: false, status: res.status, body: bodyText.slice(0, 200) });
        continue;
      }
      const b = JSON.parse(bodyText) as {
        access_token: string;
        scope?: string;
        expires_in?: number;
        refresh_token?: string;
        refresh_token_expires_in?: number;
      };
      const now = Date.now();
      await prisma.session.update({
        where: { id: s.id },
        data: {
          accessToken: b.access_token,
          ...(b.scope ? { scope: b.scope } : {}),
          ...(b.expires_in ? { expires: new Date(now + b.expires_in * 1000) } : {}),
          ...(b.refresh_token && b.refresh_token_expires_in
            ? {
                refreshToken: b.refresh_token,
                refreshTokenExpires: new Date(now + b.refresh_token_expires_in * 1000),
              }
            : {}),
        },
      });
      results.push({
        shop: s.shop,
        ok: true,
        expiresInSec: b.expires_in ?? null,
        gotRefreshToken: Boolean(b.refresh_token),
        scope: b.scope,
      });
    } catch (e: any) {
      results.push({ shop: s.shop, ok: false, error: String(e?.message ?? e) });
    }
  }

  return json({ migrated: results.filter((r) => r.ok).length, total: legacy.length, results });
};
