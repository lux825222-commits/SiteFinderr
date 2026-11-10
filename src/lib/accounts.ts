// Client accounts: @Cliente1 … @Cliente300. Each starts with password equal to its login.
export const MAX_CLIENT_ACCOUNTS = 300;
export const ACCOUNT_EMAIL_DOMAIN = "sitefinder.local";

/** Returns the client number for inputs like "@Cliente12" / "cliente12", or null. */
export function parseClientNumber(input: string): number | null {
  const match = input.trim().match(/^@?cliente(\d{1,3})$/i);
  if (!match) return null;
  const digits = match[1]!;
  if (digits.startsWith("0")) return null;
  const n = Number(digits);
  if (!Number.isInteger(n) || n < 1 || n > MAX_CLIENT_ACCOUNTS) return null;
  return n;
}

export function canonicalUsername(n: number): string {
  return `@Cliente${n}`;
}

export function accountEmail(n: number): string {
  return `cliente${n}@${ACCOUNT_EMAIL_DOMAIN}`;
}

/** Initial credential rule: password must equal the canonical login exactly. */
export function matchesInitialCredential(username: string, password: string): number | null {
  const n = parseClientNumber(username);
  if (n === null) return null;
  return password === canonicalUsername(n) ? n : null;
}
