import prisma from "~/db.server";

/** True when the shop is on the paid Pro plan. */
export async function isProShop(shop: string): Promise<boolean> {
  const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
  return sub?.plan === "PRO";
}
