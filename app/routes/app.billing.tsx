import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Plan comes from our DB (synced by the APP_SUBSCRIPTIONS_UPDATE webhook).
  const sub = await prisma.shopSubscription.findUnique({
    where: { shop: session.shop },
  });

  // App handle is needed to build the Shopify Managed Pricing page URL.
  let appHandle = "";
  try {
    const resp = await admin.graphql(
      `#graphql
      query { currentAppInstallation { app { handle } } }`,
    );
    const data = await resp.json();
    appHandle = data?.data?.currentAppInstallation?.app?.handle || "";
  } catch (e) {
    console.error("[billing] could not resolve app handle:", e);
  }

  const storeHandle = session.shop.replace(".myshopify.com", "");
  const pricingUrl = appHandle
    ? `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`
    : "";

  return json({
    isPro: sub?.plan === "PRO",
    price: Number(process.env.BILLING_PRO_PRICE || 9),
    currency: process.env.BILLING_CURRENCY || "USD",
    trialDays: Number(process.env.BILLING_PRO_TRIAL_DAYS || 7),
    pricingUrl,
  });
};

// Features that actually work today.
const PRO_FEATURES = [
  "Remove “Powered by Widerruf” branding from your storefront",
  "Priority support",
];

// Planned — clearly labelled so we never charge for something that isn't live.
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

  const symbol = ({ USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[currency] ?? "";
  const suffix = symbol ? "" : ` ${currency}`;

  return (
    <Page title="Plan & billing">
      <Layout>
        {!pricingUrl && (
          <Layout.Section>
            <Banner tone="warning" title="Plan selection unavailable">
              Couldn’t open the plan page right now. Please reload the app and
              try again.
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
                  <Button url={pricingUrl} target="_top">
                    Manage plan
                  </Button>
                </InlineStack>
              ) : (
                <Button variant="primary" url={pricingUrl} target="_top" disabled={!pricingUrl}>
                  {trialDays > 0
                    ? `Start ${trialDays}-day free trial`
                    : "Choose Pro plan"}
                </Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
