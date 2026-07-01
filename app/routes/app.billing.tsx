import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);

  let isPro = false;
  try {
    const { hasActivePayment } = await billing.check({
      plans: [PLAN_PRO],
      isTest: BILLING_TEST,
    });
    isPro = hasActivePayment;
    await prisma.shopSubscription.upsert({
      where: { shop: session.shop },
      update: { plan: isPro ? "PRO" : "FREE" },
      create: { shop: session.shop, plan: isPro ? "PRO" : "FREE" },
    });
  } catch (e) {
    // Fall back to the DB (webhook-synced) if the live check fails.
    console.error("[billing] check failed, using DB:", e);
    const sub = await prisma.shopSubscription.findUnique({
      where: { shop: session.shop },
    });
    isPro = sub?.plan === "PRO";
  }

  return json({
    isPro,
    price: Number(process.env.BILLING_PRO_PRICE || 9),
    currency: process.env.BILLING_CURRENCY || "USD",
    trialDays: Number(process.env.BILLING_PRO_TRIAL_DAYS || 7),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
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

    // Upgrade: throws a redirect Response to Shopify's approval screen.
    return await billing.request({
      plan: PLAN_PRO,
      isTest: BILLING_TEST,
      returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing`,
    });
  } catch (e) {
    if (e instanceof Response) throw e; // intended redirect
    console.error("[billing] action failed:", e);
    return json({ error: "unavailable" }, { status: 200 });
  }
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
  const { isPro, price, currency, trialDays } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const act = (intent: string) => submit({ intent }, { method: "post" });
  const symbol =
    ({ USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[currency] ?? "";
  const suffix = symbol ? "" : ` ${currency}`;

  return (
    <Page title="Plan & billing">
      <Layout>
        {(actionData as any)?.error && (
          <Layout.Section>
            <Banner tone="warning" title="Couldn’t start the upgrade">
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
