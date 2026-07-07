/**
 * Shopify order automation for the withdrawal flow (PRO).
 *
 *  - Match the customer's order by the reference they typed.
 *  - Auto-cancel the order if it is still unfulfilled (restock inventory).
 *  - Create a full refund using Shopify's own `suggestedRefund` recipe.
 *
 * Everything here is best-effort: the withdrawal status update must never fail
 * because an order action failed. Callers record the outcome in the audit trail.
 *
 * Uses the Admin GraphQL API (2024-01). We keep the client type minimal so we
 * don't couple to the Shopify SDK's internal types.
 */

type AdminGraphql = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;

export interface AdminLike {
  graphql: AdminGraphql;
}

export interface MatchedOrder {
  id: string; // gid://shopify/Order/…
  name: string; // "#1001"
  fulfillmentStatus: string; // FULFILLED | UNFULFILLED | PARTIALLY_FULFILLED | …
  cancelledAt: string | null;
  financialStatus: string | null; // PAID | REFUNDED | …
}

export interface OrderActionResult {
  ok: boolean;
  orderGid?: string;
  orderName?: string;
  cancelled?: boolean;
  refunded?: boolean;
  errors: string[];
  /** true when nothing needed doing (already cancelled/refunded, no order, etc.) */
  skipped?: boolean;
  skipReason?: string;
}

/** Normalize a customer-typed order ref into a Shopify search query. */
function orderSearchQuery(ref: string): string {
  const trimmed = ref.trim();
  const bare = trimmed.replace(/^#/, "");
  // Match "#1001", "1001", or the exact name the customer typed.
  return `name:#${bare} OR name:${bare}`;
}

async function gql<T = any>(
  admin: AdminLike,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: T; errors?: any[] }> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  return (await res.json()) as { data?: T; errors?: any[] };
}

function topLevelErrors(errors?: any[]): string[] {
  return (errors ?? []).map((e) => (typeof e?.message === "string" ? e.message : JSON.stringify(e)));
}

/** Find the best-matching order for a typed reference. */
export async function findOrderByRef(
  admin: AdminLike,
  ref: string,
): Promise<MatchedOrder | null> {
  const query = `#graphql
    query FindOrder($q: String!) {
      orders(first: 5, query: $q, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id
          name
          displayFulfillmentStatus
          displayFinancialStatus
          cancelledAt
        } }
      }
    }`;
  const { data } = await gql(admin, query, { q: orderSearchQuery(ref) });
  const edges = data?.orders?.edges ?? [];
  if (edges.length === 0) return null;
  // Prefer an exact name match; else the most recent.
  const bare = ref.trim().replace(/^#/, "");
  const exact =
    edges.find((e: any) => e.node.name === `#${bare}` || e.node.name === bare) ?? edges[0];
  const n = exact.node;
  return {
    id: n.id,
    name: n.name,
    fulfillmentStatus: n.displayFulfillmentStatus,
    cancelledAt: n.cancelledAt,
    financialStatus: n.displayFinancialStatus ?? null,
  };
}

export type OrderVerifyStatus = "MATCH" | "NO_ORDER" | "EMAIL_MISMATCH" | "UNAVAILABLE";

export interface OrderVerifyResult {
  status: OrderVerifyStatus;
  orderGid?: string;
  orderName?: string;
}

/**
 * Storefront-side check: does an order with this number exist AND belong to this
 * email? Used to validate withdrawal submissions. Fails open ("UNAVAILABLE") on
 * any API error so a real customer is never wrongly blocked by our outage.
 */
export async function verifyOrder(
  admin: AdminLike,
  orderRef: string,
  email: string,
): Promise<OrderVerifyResult> {
  const query = `#graphql
    query VerifyOrder($q: String!) {
      orders(first: 10, query: $q, sortKey: CREATED_AT, reverse: true) {
        edges { node { id name email } }
      }
    }`;
  try {
    const { data, errors } = await gql(admin, query, { q: orderSearchQuery(orderRef) });
    if (errors && errors.length) return { status: "UNAVAILABLE" };
    const edges = data?.orders?.edges ?? [];
    if (edges.length === 0) return { status: "NO_ORDER" };

    const wanted = email.trim().toLowerCase();
    const match = edges.find(
      (e: any) => (e.node.email || "").trim().toLowerCase() === wanted,
    );
    if (match) {
      return { status: "MATCH", orderGid: match.node.id, orderName: match.node.name };
    }
    return { status: "EMAIL_MISMATCH", orderName: edges[0].node.name };
  } catch (err) {
    console.error("[verifyOrder] admin query failed:", err);
    return { status: "UNAVAILABLE" };
  }
}

/** Cancel an order (optionally refunding + restocking). */
async function cancelOrder(
  admin: AdminLike,
  orderGid: string,
  refund: boolean,
): Promise<{ ok: boolean; errors: string[] }> {
  const mutation = `#graphql
    mutation CancelOrder($orderId: ID!, $reason: OrderCancelReason!, $refund: Boolean!, $restock: Boolean!, $notifyCustomer: Boolean) {
      orderCancel(orderId: $orderId, reason: $reason, refund: $refund, restock: $restock, notifyCustomer: $notifyCustomer) {
        job { id }
        orderCancelUserErrors { field message }
      }
    }`;
  const { data, errors } = await gql(admin, mutation, {
    orderId: orderGid,
    reason: "CUSTOMER",
    refund,
    restock: true,
    notifyCustomer: false, // we send our own durable-medium email
  });
  const userErrors = data?.orderCancel?.orderCancelUserErrors ?? [];
  const msgs = [...topLevelErrors(errors), ...userErrors.map((e: any) => e.message)];
  return { ok: msgs.length === 0, errors: msgs };
}

/** Create a full refund for an order using Shopify's suggestedRefund. */
async function refundOrderFully(
  admin: AdminLike,
  orderGid: string,
): Promise<{ ok: boolean; refunded: boolean; errors: string[] }> {
  const suggestQuery = `#graphql
    query Suggest($id: ID!) {
      order(id: $id) {
        suggestedRefund(refundShipping: { fullRefund: true }) {
          amountSet { shopMoney { amount currencyCode } }
          refundLineItems {
            lineItem { id }
            quantity
            restockType
            location { id }
          }
          shipping { amountSet { shopMoney { amount } } }
          suggestedTransactions {
            amountSet { shopMoney { amount currencyCode } }
            gateway
            parentTransaction { id }
          }
        }
      }
    }`;
  const { data, errors } = await gql(admin, suggestQuery, { id: orderGid });
  const errs = topLevelErrors(errors);
  const suggested = data?.order?.suggestedRefund;
  if (!suggested) {
    return { ok: errs.length === 0, refunded: false, errors: errs };
  }

  const amount = Number(suggested.amountSet?.shopMoney?.amount ?? 0);
  const hasTx = (suggested.suggestedTransactions ?? []).some(
    (t: any) => Number(t.amountSet?.shopMoney?.amount ?? 0) > 0,
  );
  if (amount <= 0 || !hasTx) {
    // Nothing left to refund (already refunded / unpaid).
    return { ok: true, refunded: false, errors: errs };
  }

  const refundLineItems = (suggested.refundLineItems ?? [])
    .filter((li: any) => li.quantity > 0)
    .map((li: any) => ({
      lineItemId: li.lineItem.id,
      quantity: li.quantity,
      restockType: li.restockType,
      locationId: li.location?.id ?? undefined,
    }));

  const transactions = (suggested.suggestedTransactions ?? [])
    .filter((t: any) => Number(t.amountSet?.shopMoney?.amount ?? 0) > 0)
    .map((t: any) => ({
      orderId: orderGid,
      gateway: t.gateway,
      kind: "REFUND",
      parentId: t.parentTransaction?.id,
      amount: t.amountSet.shopMoney.amount,
    }));

  const shippingAmount = Number(suggested.shipping?.amountSet?.shopMoney?.amount ?? 0);

  const mutation = `#graphql
    mutation CreateRefund($input: RefundInput!) {
      refundCreate(input: $input) {
        refund { id }
        userErrors { field message }
      }
    }`;
  const { data: rData, errors: rErrors } = await gql(admin, mutation, {
    input: {
      orderId: orderGid,
      notify: false,
      note: "Withdrawal (EU Directive 2023/2673) processed",
      refundLineItems,
      transactions,
      ...(shippingAmount > 0 ? { shipping: { amount: shippingAmount } } : {}),
    },
  });
  const userErrors = rData?.refundCreate?.userErrors ?? [];
  const msgs = [...topLevelErrors(rErrors), ...userErrors.map((e: any) => e.message)];
  return { ok: msgs.length === 0, refunded: msgs.length === 0, errors: msgs };
}

/**
 * Run the configured automation for a processed withdrawal. Best-effort:
 * returns a structured result the caller records; never throws.
 */
export async function runWithdrawalAutomation(
  admin: AdminLike,
  opts: { orderRef: string | null; autoCancel: boolean; autoRefund: boolean },
): Promise<OrderActionResult> {
  const result: OrderActionResult = { ok: true, errors: [] };
  if (!opts.autoCancel && !opts.autoRefund) {
    return { ...result, skipped: true, skipReason: "no automation enabled" };
  }
  if (!opts.orderRef) {
    return { ...result, skipped: true, skipReason: "no order reference on request" };
  }

  try {
    const order = await findOrderByRef(admin, opts.orderRef);
    if (!order) {
      return { ...result, skipped: true, skipReason: "order not found" };
    }
    result.orderGid = order.id;
    result.orderName = order.name;

    if (order.cancelledAt) {
      return { ...result, skipped: true, skipReason: "order already cancelled" };
    }

    const isUnfulfilled =
      order.fulfillmentStatus === "UNFULFILLED" ||
      order.fulfillmentStatus === "PARTIALLY_FULFILLED";

    // Case 1: cancel an unfulfilled order (optionally refunding in the same call).
    if (opts.autoCancel && isUnfulfilled) {
      const refundOnCancel = opts.autoRefund;
      const c = await cancelOrder(admin, order.id, refundOnCancel);
      if (c.ok) {
        result.cancelled = true;
        if (refundOnCancel) result.refunded = true;
      } else {
        result.ok = false;
        result.errors.push(...c.errors);
      }
      return result;
    }

    // Case 2: refund without cancelling (fulfilled order, or cancel not enabled).
    if (opts.autoRefund) {
      const r = await refundOrderFully(admin, order.id);
      if (r.ok) {
        result.refunded = r.refunded;
      } else {
        result.ok = false;
        result.errors.push(...r.errors);
      }
      return result;
    }

    // autoCancel enabled but order is fulfilled → nothing safe to auto-do.
    return { ...result, skipped: true, skipReason: "order fulfilled; not auto-cancelling" };
  } catch (err) {
    return {
      ...result,
      ok: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}
