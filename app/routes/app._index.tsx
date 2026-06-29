import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useEffect } from "react";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Badge,
  Text,
  EmptyState,
  Button,
  BlockStack,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import type { WithdrawalStatus } from "~/lib/types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [requests, pendingCount, sub, settings] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.withdrawalRequest.count({ where: { shop, status: "PENDING" } }),
    prisma.shopSubscription.findUnique({ where: { shop } }),
    prisma.settings.findUnique({ where: { shop } }),
  ]);

  return json({
    requests: requests.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      confirmationSentAt: r.confirmationSentAt?.toISOString() ?? null,
    })),
    pendingCount,
    plan: sub?.plan ?? "FREE",
    configured: Boolean(settings),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const id = String(form.get("id"));
  const status = String(form.get("status")) as WithdrawalStatus;

  const req = await prisma.withdrawalRequest.findFirst({
    where: { id, shop: session.shop },
  });
  if (!req) return json({ ok: false }, { status: 404 });

  await prisma.withdrawalRequest.update({ where: { id }, data: { status } });
  await prisma.auditEvent.create({
    data: {
      requestId: id,
      type: "STATUS_CHANGED",
      payloadJson: JSON.stringify({ to: status }),
    },
  });
  return json({ ok: true });
};

function statusBadge(status: string) {
  if (status === "PROCESSED") return <Badge tone="success">Processed</Badge>;
  if (status === "REJECTED") return <Badge tone="critical">Rejected</Badge>;
  return <Badge tone="attention">Pending</Badge>;
}

export default function Dashboard() {
  const { requests, pendingCount, plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const shopify = useAppBridge();

  useEffect(() => {
    if ((actionData as any)?.ok) {
      shopify.toast.show("Request updated");
    }
  }, [actionData, shopify]);

  const setStatus = (id: string, status: string) =>
    submit({ id, status }, { method: "post" });

  return (
    <Page
      title="Withdrawal requests"
      subtitle={`Plan: ${plan} · ${pendingCount} pending`}
    >
      <Layout>
        <Layout.Section>
          {pendingCount > 0 && (
            <Banner tone="warning" title={`${pendingCount} pending request(s)`}>
              Review and process the withdrawal requests below.
            </Banner>
          )}
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            {requests.length === 0 ? (
              <EmptyState
                heading="No withdrawal requests yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Once a customer uses your withdrawal button, their requests
                  appear here with a full audit trail.
                </p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "request", plural: "requests" }}
                itemCount={requests.length}
                headings={[
                  { title: "Received (UTC)" },
                  { title: "Name" },
                  { title: "Email" },
                  { title: "Order" },
                  { title: "Status" },
                  { title: "Actions" },
                ]}
                selectable={false}
              >
                {requests.map((r, index) => (
                  <IndexTable.Row id={r.id} key={r.id} position={index}>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodySm">
                        {new Date(r.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{r.customerName}</IndexTable.Cell>
                    <IndexTable.Cell>{r.email}</IndexTable.Cell>
                    <IndexTable.Cell>{r.orderRef || "—"}</IndexTable.Cell>
                    <IndexTable.Cell>{statusBadge(r.status)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="200">
                        {r.status !== "PROCESSED" && (
                          <Button
                            size="micro"
                            onClick={() => setStatus(r.id, "PROCESSED")}
                          >
                            Mark processed
                          </Button>
                        )}
                        {r.status === "PENDING" && (
                          <Button
                            size="micro"
                            tone="critical"
                            onClick={() => setStatus(r.id, "REJECTED")}
                          >
                            Reject
                          </Button>
                        )}
                      </InlineStack>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Setup
              </Text>
              <Text as="p" variant="bodyMd">
                1. Enable the <b>Widerruf button</b> app embed in your theme
                editor.
              </Text>
              <Text as="p" variant="bodyMd">
                2. The withdrawal page is live at <code>/apps/withdrawal</code>{" "}
                on your storefront — no theme pages are modified.
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                This app is a software tool to help you comply with EU Directive
                2023/2673. It is not legal advice.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
