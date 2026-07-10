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

  // One-time migration of legacy NON-expiring offline tokens to expiring ones.
  // v4 reuses a stored token while it's "active", and a non-expiring token
  // (expires == null) is never expired — so the library never re-exchanges it and
  // it stays non-expiring forever. Now that `expiringOfflineAccessTokens` is on, a
  // forced re-exchange returns an EXPIRING token (token exchange sends expiring=1).
  // Delete the legacy offline session once, then bounce back through auth; the next
  // authenticate.admin finds no session and token-exchanges a fresh expiring one.
  // Self-terminating: after migration `expires` is set, so this never fires again.
  // Loop-safe via the `_tm=1` sentinel.
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
