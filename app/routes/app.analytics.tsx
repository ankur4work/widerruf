import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Button,
  Box,
  Divider,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { reasonLabel } from "~/lib/i18n";

const MS_PER_HOUR = 3600 * 1000;

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
  const isPro = sub?.plan === "PRO";

  // Headline count is cheap and shown to everyone.
  const total = await prisma.withdrawalRequest.count({ where: { shop } });

  if (!isPro) {
    return json({ isPro: false, total, analytics: null });
  }

  // Pull compact rows and aggregate in-app (fine at this scale).
  const rows = await prisma.withdrawalRequest.findMany({
    where: { shop },
    select: {
      status: true,
      reason: true,
      locale: true,
      createdAt: true,
      orderCancelledAt: true,
      refundedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const byStatus: Record<string, number> = { PENDING: 0, PROCESSED: 0, REJECTED: 0 };
  const byReason: Record<string, number> = {};
  const byLocale: Record<string, number> = {};
  const noReason = { n: 0 };
  let cancelled = 0;
  let refunded = 0;

  // last 6 months (including current), oldest → newest
  const months: string[] = [];
  {
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(monthKey(d));
    }
  }
  const monthCounts: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.reason) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
    else noReason.n += 1;
    byLocale[r.locale] = (byLocale[r.locale] ?? 0) + 1;
    if (r.orderCancelledAt) cancelled += 1;
    if (r.refundedAt) refunded += 1;
    const mk = monthKey(r.createdAt);
    if (mk in monthCounts) monthCounts[mk] += 1;
  }

  // Time-to-decision: earliest STATUS_CHANGED per request minus request receipt.
  const statusEvents = await prisma.auditEvent.findMany({
    where: { type: "STATUS_CHANGED", request: { shop } },
    select: { requestId: true, createdAt: true, request: { select: { createdAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  const firstDecision = new Map<string, number>();
  for (const e of statusEvents) {
    if (!firstDecision.has(e.requestId)) {
      firstDecision.set(e.requestId, e.createdAt.getTime() - e.request.createdAt.getTime());
    }
  }
  const durations = [...firstDecision.values()].filter((d) => d >= 0).sort((a, b) => a - b);
  const avgHours =
    durations.length > 0
      ? durations.reduce((s, d) => s + d, 0) / durations.length / MS_PER_HOUR
      : null;
  const medianHours =
    durations.length > 0 ? durations[Math.floor(durations.length / 2)] / MS_PER_HOUR : null;

  const reasons = Object.entries(byReason)
    .map(([code, count]) => ({ code, label: reasonLabel(code, "en"), count }))
    .sort((a, b) => b.count - a.count);
  if (noReason.n > 0) reasons.push({ code: "", label: "Not stated", count: noReason.n });

  const locales = Object.entries(byLocale)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const decided = (byStatus.PROCESSED ?? 0) + (byStatus.REJECTED ?? 0);
  const acceptanceRate = decided > 0 ? (byStatus.PROCESSED / decided) * 100 : null;

  return json({
    isPro: true,
    total,
    analytics: {
      byStatus,
      reasons,
      locales,
      months: months.map((m) => ({ month: m, count: monthCounts[m] })),
      avgHours,
      medianHours,
      acceptanceRate,
      cancelled,
      refunded,
    },
  });
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="span" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="span" variant="heading2xl">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

function Bar({ label, count, max, sub }: { label: string; count: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <BlockStack gap="100">
      <InlineStack align="space-between">
        <Text as="span" variant="bodySm">
          {label}
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {count}
          {sub ? ` · ${sub}` : ""}
        </Text>
      </InlineStack>
      <div
        style={{
          height: 8,
          borderRadius: 6,
          background: "var(--p-color-bg-surface-secondary, #eceff5)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
            height: "100%",
            borderRadius: 6,
            background: "var(--p-color-bg-fill-brand, #2563EB)",
            transition: "width .3s ease",
          }}
        />
      </div>
    </BlockStack>
  );
}

export default function Analytics() {
  const data = useLoaderData<typeof loader>();

  if (!data.isPro) {
    return (
      <Page title="Analytics">
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Analytics is a Pro feature"
                action={{ content: "Upgrade to Pro", url: "/app/billing" }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  You have <b>{data.total}</b> withdrawal request(s) recorded.
                  Upgrade to Pro to see withdrawal reasons, trends over time,
                  acceptance rate, time-to-decision and language breakdowns.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const a = data.analytics!;
  const maxReason = Math.max(1, ...a.reasons.map((r) => r.count));
  const maxMonth = Math.max(1, ...a.months.map((m) => m.count));
  const maxLocale = Math.max(1, ...a.locales.map((l) => l.count));
  const fmtH = (h: number | null) =>
    h == null ? "—" : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`;

  return (
    <Page title="Analytics" subtitle="Withdrawal insights for your store">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
            <Stat label="Total requests" value={String(data.total)} />
            <Stat label="Pending" value={String(a.byStatus.PENDING ?? 0)} />
            <Stat label="Processed" value={String(a.byStatus.PROCESSED ?? 0)} />
            <Stat label="Rejected" value={String(a.byStatus.REJECTED ?? 0)} />
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
            <Stat
              label="Acceptance rate"
              value={a.acceptanceRate == null ? "—" : `${Math.round(a.acceptanceRate)}%`}
            />
            <Stat label="Avg. time to decision" value={fmtH(a.avgHours)} />
            <Stat label="Median time to decision" value={fmtH(a.medianHours)} />
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Requests over time
              </Text>
              <InlineStack gap="400" align="space-between" blockAlign="end">
                {a.months.map((m) => {
                  const h = Math.round((m.count / maxMonth) * 120);
                  const [, mm] = m.month.split("-");
                  const name = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(mm)];
                  return (
                    <BlockStack key={m.month} gap="100" inlineAlign="center">
                      <Text as="span" variant="bodySm" tone="subdued">
                        {m.count}
                      </Text>
                      <div
                        style={{
                          width: 28,
                          height: Math.max(h, m.count > 0 ? 6 : 2),
                          borderRadius: 6,
                          background:
                            m.count > 0
                              ? "var(--p-color-bg-fill-brand, #2563EB)"
                              : "var(--p-color-bg-surface-secondary, #eceff5)",
                        }}
                      />
                      <Text as="span" variant="bodySm" tone="subdued">
                        {name}
                      </Text>
                    </BlockStack>
                  );
                })}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Withdrawal reasons
              </Text>
              {a.reasons.length === 0 ? (
                <Text as="p" tone="subdued">
                  No reasons recorded yet. Enable the reason field in Settings.
                </Text>
              ) : (
                <BlockStack gap="300">
                  {a.reasons.map((r) => (
                    <Bar key={r.code || "none"} label={r.label} count={r.count} max={maxReason} />
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Top languages
                </Text>
                {a.locales.length === 0 ? (
                  <Text as="p" tone="subdued">
                    No data yet.
                  </Text>
                ) : (
                  <BlockStack gap="300">
                    {a.locales.map((l) => (
                      <Bar key={l.code} label={l.code.toUpperCase()} count={l.count} max={maxLocale} />
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Automation
                </Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span">Orders auto-cancelled</Text>
                    <Text as="span" variant="headingMd">
                      {a.cancelled}
                    </Text>
                  </InlineStack>
                  <Divider />
                  <InlineStack align="space-between">
                    <Text as="span">Refunds created</Text>
                    <Text as="span" variant="headingMd">
                      {a.refunded}
                    </Text>
                  </InlineStack>
                </BlockStack>
                <Box>
                  <Button url="/app/export?format=csv" variant="secondary">
                    Export all as CSV
                  </Button>
                </Box>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
