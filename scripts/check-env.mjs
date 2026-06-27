const required = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
  "SCOPES",
  "DATABASE_URL",
  "DIRECT_URL",
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}
