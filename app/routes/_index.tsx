import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Embedded launch (Shopify opens the app with ?shop=...): go to the embedded
  // app, which carries the correct frame-ancestors CSP and uses token-exchange
  // auth. Do NOT route here to /auth/login — that triggers an OAuth redirect to
  // admin.shopify.com inside the iframe, which the browser refuses to frame.
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // No shop context (direct visit): send to the login form.
  throw redirect("/auth/login");
};

export default function Index() {
  return null;
}
