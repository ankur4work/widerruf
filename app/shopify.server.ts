import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  DeliveryMethod,
  BillingInterval,
} from "@shopify/shopify-app-remix/server";

// Single paid plan. Free = no billing.
export const PLAN_PRO = "Pro";
export const BILLING_TEST = process.env.SHOPIFY_BILLING_TEST !== "false";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,
  billing: {
    [PLAN_PRO]: {
      lineItems: [
        {
          amount: Number(process.env.BILLING_PRO_PRICE || 9),
          currencyCode: process.env.BILLING_CURRENCY || "EUR",
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: Number(process.env.BILLING_PRO_TRIAL_DAYS || 7),
    },
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      try {
        await shopify.registerWebhooks({ session });
      } catch (error) {
        console.error("Failed to register webhooks after auth:", error);
      }

      // Ensure a Settings + Subscription row exists for the shop
      try {
        await prisma.settings.upsert({
          where: { shop: session.shop },
          update: {},
          create: { shop: session.shop },
        });
        await prisma.shopSubscription.upsert({
          where: { shop: session.shop },
          update: {},
          create: { shop: session.shop, plan: "FREE" },
        });
      } catch (error) {
        console.error("Failed to bootstrap shop records after auth:", error);
      }
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
