/**
 * Offline spam / junk-request heuristics.
 *
 * When the Admin order API is available we verify order number + email for real
 * (see orders.server.ts / orderCheck). But that API can be blocked (Protected
 * Customer Data gate), and even when it works it can't judge a gibberish *name*
 * or a keyboard-mashed *email*. These heuristics run 100% locally on the data we
 * already store, so the dashboard can always flag obviously-fake submissions.
 *
 * Conservative by design: we only flag when signals are strong, and we label the
 * result "Suspected" (never a hard block) so a real customer is never turned away.
 */

export interface SpamAssessment {
  suspicious: boolean;
  /** 0..n — higher = more junk signals. */
  score: number;
  reasons: string[];
}

// Common keyboard-mash runs (home row + adjacent). Lower-cased match.
const MASH_PATTERNS = [
  "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl",
  "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop",
  "zxcv", "xcvb", "cvbn", "vbnm",
  "asd", "sdf", "dfg", "qwe", "wer", "zxc", "xcv",
  "lkj", "kjh", "jhg", "hgf", "gfd", "poiu", "mnbv",
];

// Throwaway / obviously-not-a-real-customer email domains.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwaway.email", "yopmail.com", "trashmail.com",
  "getnada.com", "sharklasers.com", "maildrop.cc", "fakeinbox.com",
  "mail.com", "example.com", "test.com",
]);

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

/** Ratio of vowels among the letters in a string (0..1). Non-letters ignored. */
function vowelRatio(s: string): number {
  const letters = s.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length === 0) return 1; // no letters → don't penalise
  let v = 0;
  for (const c of letters) if (VOWELS.has(c)) v++;
  return v / letters.length;
}

/** Longest run of consecutive consonants. */
function longestConsonantRun(s: string): number {
  const letters = s.toLowerCase().replace(/[^a-z]/g, "");
  let run = 0;
  let max = 0;
  for (const c of letters) {
    if (VOWELS.has(c)) {
      run = 0;
    } else {
      run++;
      if (run > max) max = run;
    }
  }
  return max;
}

function hasMashPattern(s: string): boolean {
  const low = s.toLowerCase();
  return MASH_PATTERNS.some((p) => low.includes(p));
}

/** Longest run of the same character repeated (e.g. "aaaa" → 4). */
function longestRepeatRun(s: string): number {
  let run = 1;
  let max = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) {
      run++;
      if (run > max) max = run;
    } else {
      run = 1;
    }
  }
  return s.length ? max : 0;
}

/**
 * Does this free-text token look like keyboard mashing / gibberish rather than a
 * real word or name? Used for names and email local-parts.
 */
function looksLikeGibberish(raw: string): boolean {
  const s = (raw || "").trim();
  if (s.length < 5) return false; // too short to judge
  if (hasMashPattern(s)) return true;
  const letters = s.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 6) {
    if (vowelRatio(s) < 0.22) return true; // almost no vowels
    if (longestConsonantRun(s) >= 5) return true; // "ghvsdc"...
  }
  if (longestRepeatRun(s.toLowerCase()) >= 4) return true; // "aaaa", "sssss"
  return false;
}

/** Is a customer-typed order reference implausible for a real Shopify order? */
export function orderRefLooksFake(orderRef: string | null | undefined): boolean {
  const s = (orderRef || "").trim();
  if (!s) return false; // empty is a separate (missing) case, not "fake"
  const bare = s.replace(/^#/, "");
  const hasDigit = /\d/.test(bare);
  const letters = bare.replace(/[^a-zA-Z]/g, "");
  // Real Shopify order names are number-centric (#1001, EN-1042, 1001-A…).
  // A ref with NO digits at all and several letters is almost certainly typed junk.
  if (!hasDigit && letters.length >= 5) return true;
  // Keyboard mash even with a few digits sprinkled in ("tr345rdsaf43").
  if (hasMashPattern(bare)) return true;
  // Long, letter-heavy, vowel-starved refs ("cvgyhadvesyu").
  if (letters.length >= 8 && vowelRatio(bare) < 0.25) return true;
  return false;
}

function emailLooksFake(email: string | null | undefined): boolean {
  const s = (email || "").trim().toLowerCase();
  const at = s.indexOf("@");
  if (at <= 0) return false; // malformed handled elsewhere
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  if (looksLikeGibberish(local)) return true;
  return false;
}

/**
 * Combine all local signals into one assessment. Only flags `suspicious` when at
 * least one strong signal fires; `reasons` explains why (shown on hover).
 */
export function assessSpam(input: {
  customerName?: string | null;
  email?: string | null;
  orderRef?: string | null;
}): SpamAssessment {
  const reasons: string[] = [];

  if (orderRefLooksFake(input.orderRef)) {
    reasons.push("Order number doesn't look real");
  }
  if (emailLooksFake(input.email)) {
    reasons.push("Email looks fake or disposable");
  }
  if (looksLikeGibberish(input.customerName || "")) {
    reasons.push("Name looks like random typing");
  }

  return { suspicious: reasons.length > 0, score: reasons.length, reasons };
}
