import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // One-time migration to EXPIRING offline access tokens (Shopify requires these
  // for all public apps by 2027-01-01). The token-exchange strategy reuses a stored
  // token as long as it's "active" — but a legacy non-expiring token (expires == null)
  // never expires, so the library never swaps it for an expiring one AND never
  // re-exchanges to pick up newly-granted scopes (shopify-app-js issue #1114, the
  // cause of our read_orders 403). Fix: delete the legacy offline session once, then
  // bounce back through auth. The next authenticate.admin finds no offline session and
  // token-exchanges a fresh EXPIRING token carrying the CURRENT granted scopes.
  //
  // Loop-safe: we tag the redirect with `_tm=1` so we attempt this at most once per
  // load. If the re-exchange somehow still yields a non-expiring token, we proceed
  // with it rather than redirecting forever.
  const url = new URL(request.url);
  if (
    session &&
    !session.isOnline &&
    session.expires == null &&
    !url.searchParams.has("_tm")
  ) {
    try {
      await prisma.session.deleteMany({
        where: { shop: session.shop, isOnline: false, expires: null },
      });
    } catch (e) {
      console.error("[token-migration] failed to clear legacy session", e);
    }
    url.searchParams.set("_tm", "1");
    // Relative redirect (path + query) — robust behind the reverse proxy, no host leak.
    throw redirect(url.pathname + url.search);
  }

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/billing">Plan & billing</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
