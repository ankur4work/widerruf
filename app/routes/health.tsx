import { json } from "@remix-run/node";

// Lightweight health check for Coolify / uptime monitoring
export const loader = async () => {
  return json({ status: "ok", app: "widerruf-eu-withdrawal-button" });
};
