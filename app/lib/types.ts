export type Plan = "FREE" | "PRO";
export type WithdrawalStatus = "PENDING" | "PROCESSED" | "REJECTED";
export type ButtonMode = "FOOTER" | "FLOATING";

export const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  "PENDING",
  "PROCESSED",
  "REJECTED",
];
