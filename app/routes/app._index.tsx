import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useEffect, useState } from "react";
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
  Modal,
  TextField,
  Checkbox,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { sendDecisionEmail } from "~/lib/email.server";
import { runWithdrawalAutomation } from "~/lib/orders.server";
import { reasonLabel } from "~/lib/i18n";
import {
  defaultDecisionTemplate,
  renderTemplate,
  orderFragment,
  type DecisionStatus,
} from "~/lib/email-templates";
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
      id: r.id,
      customerName: r.customerName,
      email: r.email,
      orderRef: r.orderRef,
      reason: r.reason,
      locale: r.locale,
      status: r.status,
      decisionNote: r.decisionNote,
      createdAt: r.createdAt.toISOString(),
      confirmationSentAt: r.confirmationSentAt?.toISOString() ?? null,
    })),
    pendingCount,
    plan: sub?.plan ?? "FREE",
    configured: Boolean(settings),
    storeName: settings?.senderName || shop,
    templates: {
      PROCESSED: {
        subject: settings?.emailProcessedSubject ?? "",
        body: settings?.emailProcessedBody ?? "",
      },
      REJECTED: {
        subject: settings?.emailRejectedSubject ?? "",
        body: settings?.emailRejectedBody ?? "",
      },
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const id = String(form.get("id"));
  const status = String(form.get("status")) as WithdrawalStatus;
  const decisionNote = (String(form.get("decisionNote") || "").trim()) || null;
  const sendEmail = form.get("sendEmail") === "true";
  const emailSubject = String(form.get("subject") || "").trim();
  const emailBody = String(form.get("body") || "").trim();

  const req = await prisma.withdrawalRequest.findFirst({
    where: { id, shop: session.shop },
  });
  if (!req) return json({ ok: false }, { status: 404 });

  await prisma.withdrawalRequest.update({
    where: { id },
    data: { status, decisionNote },
  });
  await prisma.auditEvent.create({
    data: {
      requestId: id,
      type: "STATUS_CHANGED",
      payloadJson: JSON.stringify({ to: status, note: decisionNote }),
    },
  });

  if (status === "PROCESSED" || status === "REJECTED") {
    const [settings, sub] = await Promise.all([
      prisma.settings.findUnique({ where: { shop: session.shop } }),
      prisma.shopSubscription.findUnique({ where: { shop: session.shop } }),
    ]);

    // Send the exact email the merchant reviewed & edited (only if they chose to).
    if (sendEmail && emailSubject && emailBody) {
      const ok = await sendDecisionEmail({
        to: req.email,
        shop: session.shop,
        locale: req.locale,
        customerName: req.customerName,
        subject: emailSubject,
        body: emailBody,
        fromName: settings?.senderName,
        replyTo: settings?.emailReplyTo,
        customFrom: settings?.emailFrom,
        accent: settings?.accentColor,
      });
      if (ok) {
        await prisma.auditEvent.create({
          data: {
            requestId: id,
            type: "DECISION_EMAIL_SENT",
            payloadJson: JSON.stringify({ status, subject: emailSubject }),
          },
        });
      }
    }

    // Pro order automation on acceptance (best-effort; never blocks the status).
    const isPro = sub?.plan === "PRO";
    const wantsAutomation =
      isPro &&
      status === "PROCESSED" &&
      (settings?.autoCancelUnfulfilled || settings?.autoRefundOnProcess);
    if (wantsAutomation) {
      const outcome = await runWithdrawalAutomation(admin, {
        orderRef: req.orderRef,
        autoCancel: settings!.autoCancelUnfulfilled,
        autoRefund: settings!.autoRefundOnProcess,
      });

      const now = new Date();
      const updates: Record<string, unknown> = {};
      if (outcome.orderGid) updates.orderGid = outcome.orderGid;
      if (outcome.cancelled) updates.orderCancelledAt = now;
      if (outcome.refunded) updates.refundedAt = now;
      if (Object.keys(updates).length > 0) {
        await prisma.withdrawalRequest
          .update({ where: { id }, data: updates })
          .catch(() => {});
      }
      if (outcome.cancelled) {
        await prisma.auditEvent
          .create({
            data: {
              requestId: id,
              type: "ORDER_CANCELLED",
              payloadJson: JSON.stringify({ orderName: outcome.orderName }),
            },
          })
          .catch(() => {});
      }
      if (outcome.refunded) {
        await prisma.auditEvent
          .create({
            data: {
              requestId: id,
              type: "REFUND_CREATED",
              payloadJson: JSON.stringify({ orderName: outcome.orderName }),
            },
          })
          .catch(() => {});
      }
      if (!outcome.ok && outcome.errors.length) {
        console.error(
          `[automation] shop=${session.shop} req=${id} errors=`,
          outcome.errors,
        );
      }
      return json({ ok: true, automation: outcome });
    }
  }

  return json({ ok: true });
};

function statusBadge(status: string) {
  if (status === "PROCESSED") return <Badge tone="success">Processed</Badge>;
  if (status === "REJECTED") return <Badge tone="critical">Rejected</Badge>;
  return <Badge tone="attention">Pending</Badge>;
}

type RequestRow = ReturnType<typeof useLoaderData<typeof loader>>["requests"][number];

export default function Dashboard() {
  const { requests, pendingCount, plan, storeName, templates } =
    useLoaderData<typeof loader>();
  const isPro = plan === "PRO";
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const shopify = useAppBridge();

  useEffect(() => {
    if ((actionData as any)?.ok) {
      shopify.toast.show("Request updated");
    }
  }, [actionData, shopify]);

  // --- Decision modal (accept / reject with editable email) ---
  const [target, setTarget] = useState<RequestRow | null>(null);
  const [decision, setDecision] = useState<DecisionStatus>("PROCESSED");
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyTouched, setBodyTouched] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  function composeEmail(r: RequestRow, status: DecisionStatus, reason: string) {
    const def = defaultDecisionTemplate(status, r.locale);
    const subjTpl = templates[status].subject || def.subject;
    const bodyTpl = templates[status].body || def.body;
    const vars = {
      customer_name: r.customerName,
      store_name: storeName,
      order: orderFragment(r.orderRef, r.locale),
      reason,
    };
    return {
      subject: renderTemplate(subjTpl, vars),
      body: renderTemplate(bodyTpl, vars),
    };
  }

  function openDecision(r: RequestRow, status: DecisionStatus) {
    const email = composeEmail(r, status, "");
    setTarget(r);
    setDecision(status);
    setNote("");
    setSubject(email.subject);
    setBody(email.body);
    setBodyTouched(false);
    setSendEmail(true);
  }

  function onNoteChange(v: string) {
    setNote(v);
    if (target && !bodyTouched) {
      setBody(composeEmail(target, decision, v).body);
    }
  }

  function closeDecision() {
    setTarget(null);
  }

  function confirmDecision() {
    if (!target) return;
    const fd = new FormData();
    fd.set("id", target.id);
    fd.set("status", decision);
    fd.set("decisionNote", note);
    fd.set("sendEmail", String(sendEmail));
    fd.set("subject", subject);
    fd.set("body", body);
    submit(fd, { method: "post" });
    closeDecision();
  }

  const decisionLabel = decision === "PROCESSED" ? "processed" : "rejected";

  return (
    <Page
      title="Withdrawal requests"
      subtitle={`Plan: ${plan} · ${pendingCount} pending`}
      secondaryActions={
        requests.length > 0
          ? [
              {
                content: "Export CSV",
                url: "/app/export?format=csv",
                target: "_blank",
                helpText: isPro ? undefined : "Pro",
              },
              {
                content: "Export PDF pack",
                url: "/app/export?format=pdf",
                target: "_blank",
                helpText: isPro ? undefined : "Pro",
              },
            ]
          : undefined
      }
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
                  { title: "Reason" },
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
                    <IndexTable.Cell>
                      <Text as="span" variant="bodySm">
                        {r.reason ? reasonLabel(r.reason, "en") : "—"}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{statusBadge(r.status)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="200" blockAlign="center">
                        {r.status === "PENDING" && (
                          <>
                            <Button
                              size="micro"
                              onClick={() => openDecision(r, "PROCESSED")}
                            >
                              Accept
                            </Button>
                            <Button
                              size="micro"
                              tone="critical"
                              onClick={() => openDecision(r, "REJECTED")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="micro"
                          variant="plain"
                          url={`/app/requests/${r.id}/pdf`}
                          target="_blank"
                        >
                          PDF
                        </Button>
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

      {target && (
        <Modal
          open
          onClose={closeDecision}
          title={decision === "PROCESSED" ? "Accept withdrawal" : "Reject withdrawal"}
          primaryAction={{
            content: sendEmail
              ? `Send email & mark ${decisionLabel}`
              : `Mark ${decisionLabel} (no email)`,
            onAction: confirmDecision,
            destructive: decision === "REJECTED",
          }}
          secondaryActions={[{ content: "Cancel", onAction: closeDecision }]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd" tone="subdued">
                {decision === "PROCESSED"
                  ? `Accepting ${target.customerName}'s withdrawal`
                  : `Rejecting ${target.customerName}'s withdrawal`}
                {target.orderRef ? ` · order ${target.orderRef}` : ""}
              </Text>

              <TextField
                label={
                  decision === "REJECTED"
                    ? "Reason for rejection"
                    : "Note to the customer (optional)"
                }
                value={note}
                onChange={onNoteChange}
                multiline={2}
                autoComplete="off"
                helpText="This is inserted into the email below. You can still edit the email directly."
              />

              <Checkbox
                label="Send this email to the customer"
                checked={sendEmail}
                onChange={setSendEmail}
              />

              <TextField
                label="Email subject"
                value={subject}
                onChange={setSubject}
                autoComplete="off"
                disabled={!sendEmail}
              />
              <TextField
                label="Email message"
                value={body}
                onChange={(v) => {
                  setBody(v);
                  setBodyTouched(true);
                }}
                multiline={8}
                autoComplete="off"
                disabled={!sendEmail}
              />

              {sendEmail && (
                <Box
                  background="bg-surface-secondary"
                  borderRadius="200"
                  padding="400"
                >
                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Preview
                    </Text>
                    <Text as="p" variant="headingSm">
                      {subject}
                    </Text>
                    <Divider />
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.5 }}>
                      {body}
                    </div>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
