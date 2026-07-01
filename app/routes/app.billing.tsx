import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useEffect } from "react";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  List,
  Divider,
  Banner,
} from "@shopify/polaris";
import { authenticate, PLAN_PRO, BILLING_TEST } from "~/shopify.server";
import prisma from "~/db.server";

// Build the Shopify Managed Pricing page URL (fallback when the Billing API
// is blocked). Needs the app handle, fetched via the Admin GraphQL.
async function managedPricingUrl(
  admin: { graphql: (q: string) => Promise<Response> },
  shop: string,
): Promise<string> {
  let handle = "";
  try {
    const r = await admin.graphql(
      `#graphql
      query { currentAppInstallation { app { handle } } }`,
    );
    const d = await r.json();
    handle = d?.data?.currentAppInstallation?.app?.handle || "";
  } catch (e) {
    console.error("[billing] app handle lookup failed:", e);
  }
  const store = shop.replace(".myshopify.com", "");
  return handle
    ? `https://admin.shopify.com/store/${store}/charges/${handle}/pricing_plans`
    : "";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const sub = await prisma.shopSubscription.findUnique({
    where: { shop: session.shop },
  });
  const pricingUrl = await managedPricingUrl(admin, session.shop);
  return json({
    isPro: sub?.plan === "PRO",
    price: Number(process.env.BILLING_PRO_PRICE || 9),
    currency: process.env.BILLING_CURRENCY || "USD",
    trialDays: Number(process.env.BILLING_PRO_TRIAL_DAYS || 7),
    pricingUrl,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, admin, session } = await authenticate.admin(request);
  const intent = String((await request.formData()).get("intent"));

  try {
    if (intent === "cancel") {
      const { appSubscriptions } = await billing.check({
        plans: [PLAN_PRO],
        isTest: BILLING_TEST,
      });
      const sub = appSubscriptions[0];
      if (sub) {
        await billing.cancel({
          subscriptionId: sub.id,
          isTest: BILLING_TEST,
          prorate: true,
        });
      }
      return redirect("/app/billing");
    }

    // Preferred path: Billing API. Throws a redirect Response on success.
    return await billing.request({
      plan: PLAN_PRO,
      isTest: BILLING_TEST,
      returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing`,
    });
  } catch (e) {
    if (e instanceof Response) throw e; // intended redirect — let it through
    // Billing API blocked (managed pricing). Fall back to the pricing page.
    console.error("[billing] falling back to managed pricing page:", e);
    const pricingUrl = await managedPricingUrl(admin, session.shop);
    return json({ fallback: true, pricingUrl });
  }
};

const PRO_FEATURES = [
  "Remove “Powered by Widerruf” branding from your storefront",
  "Priority support",
];
const COMING_SOON = [
  "Shopify Returns / refund auto-sync",
  "Auto-cancel unfulfilled orders on withdrawal",
  "Send emails from your own domain",
  "PDF evidence packs + bulk export",
  "Analytics & withdrawal reasons",
];

export default function Billing() {
  const { isPro, price, currency, trialDays, pricingUrl } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as
    | { fallback?: boolean; pricingUrl?: string }
    | undefined;
  const submit = useSubmit();

  // If the Billing API was blocked, open Shopify's plan page in the top frame.
  useEffect(() => {
    const url = actionData?.fallback ? actionData?.pricingUrl : "";
    if (url) window.open(url, "_top");
  }, [actionData]);

  const act = (intent: string) => submit({ intent }, { method: "post" });
  const symbol =
    ({ USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[currency] ?? "";
  const suffix = symbol ? "" : ` ${currency}`;
  const fallbackNoUrl = actionData?.fallback && !actionData?.pricingUrl;

  return (
    <Page title="Plan & billing">
      <Layout>
        {fallbackNoUrl && (
          <Layout.Section>
            <Banner tone="warning" title="Couldn’t open the plan page">
              Please reload the app and try again.
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Current plan
                </Text>
                {isPro ? <Badge tone="success">Pro</Badge> : <Badge>Free</Badge>}
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                Your withdrawal button, form, emails, dashboard, audit trail and
                24 EU languages are always free. Pro adds automation and removes
                branding.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Pro
                </Text>
                <Text as="span" variant="headingLg">
                  {symbol}
                  {price}
                  {suffix}
                  <Text as="span" variant="bodySm" tone="subdued">
                    {" "}
                    / month
                  </Text>
                </Text>
              </InlineStack>
              <List>
                {PRO_FEATURES.map((f) => (
                  <List.Item key={f}>{f}</List.Item>
                ))}
              </List>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  Coming soon
                </Text>
                {COMING_SOON.map((f) => (
                  <Text key={f} as="p" variant="bodyMd" tone="subdued">
                    • {f}
                  </Text>
                ))}
              </BlockStack>
              <Divider />
              {isPro ? (
                <InlineStack gap="300" blockAlign="center">
                  <Badge tone="success">Active</Badge>
                  <Button tone="critical" onClick={() => act("cancel")}>
                    Cancel subscription
                  </Button>
                </InlineStack>
              ) : (
                <Button variant="primary" onClick={() => act("upgrade")}>
                  {trialDays > 0
                    ? `Start ${trialDays}-day free trial`
                    : "Upgrade to Pro"}
                </Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
