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

// Fixed app handle (from the app's admin URL). Used to build the Shopify
// Managed Pricing page link. Overridable via env if the handle ever changes.
const APP_HANDLE = process.env.SHOPIFY_APP_HANDLE || "widerruf-eu-withdrawal-button";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Plan comes from our DB (kept in sync by the APP_SUBSCRIPTIONS_UPDATE webhook).
  const sub = await prisma.shopSubscription.findUnique({
    where: { shop: session.shop },
  });

  // The app uses Shopify Managed Pricing — send merchants to Shopify's hosted
  // plan page (no API call needed).
  const store = session.shop.replace(".myshopify.com", "");
  const pricingUrl = `https://admin.shopify.com/store/${store}/charges/${APP_HANDLE}/pricing_plans`;

  return json({
    isPro: sub?.plan === "PRO",
    price: Number(process.env.BILLING_PRO_PRICE || 9),
    currency: process.env.BILLING_CURRENCY || "USD",
    trialDays: Number(process.env.BILLING_PRO_TRIAL_DAYS || 7),
    pricingUrl,
  });
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

  const symbol =
    ({ USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[currency] ?? "";
  const suffix = symbol ? "" : ` ${currency}`;

  return (
    <Page title="Plan & billing">
      <Layout>
        {!pricingUrl && (
          <Layout.Section>
            <Banner tone="warning" title="Plan page unavailable">
              Couldn’t open the plan page. Please reload the app and try again.
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
                  <Button url={pricingUrl} target="_top" disabled={!pricingUrl}>
                    Manage plan
                  </Button>
                </InlineStack>
              ) : (
                <Button
                  variant="primary"
                  url={pricingUrl}
                  target="_top"
                  disabled={!pricingUrl}
                >
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
