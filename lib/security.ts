import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const OPS_SESSION_SECONDS = 8 * 60 * 60;

function equalText(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function passwordMatches(candidate: string, password: string): boolean {
  return password.length > 0 && equalText(candidate, password);
}

export function createOpsSession(password: string, now = Date.now()): string {
  if (!password) throw new Error("OPS_PASSWORD is required");
  const payload = `${Math.floor(now / 1000) + OPS_SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  const mac = createHmac("sha256", password).update(`conferencex-ops:${payload}`).digest("hex");
  return `${payload}.${mac}`;
}

export function verifyOpsSession(token: string | undefined, password: string, now = Date.now()): boolean {
  if (!token || !password) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiry, nonce, mac] = parts;
  if (!/^\d+$/.test(expiry) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)) return false;
  const expiresAt = Number(expiry);
  const seconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= seconds || expiresAt > seconds + OPS_SESSION_SECONDS) return false;
  const expected = createHmac("sha256", password).update(`conferencex-ops:${expiry}.${nonce}`).digest("hex");
  return equalText(mac, expected);
}

export function verifyZeffySignature(
  rawBody: Uint8Array,
  header: string | null,
  secret: string,
  now = Date.now(),
): boolean {
  if (!header || !secret) return false;
  const fields = header.split(",").map((part) => part.trim());
  const timestamps = fields.filter((part) => part.startsWith("t="));
  if (timestamps.length !== 1) return false;
  const timestamp = timestamps[0].slice(2);
  if (!/^\d+$/.test(timestamp)) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(now / 1000) - seconds) > 300) return false;
  // Sign the original bytes, never JSON.stringify(parsedBody).
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
  return fields.filter((part) => part.startsWith("v1=")).some((part) => {
    const signature = part.slice(3);
    return /^[a-fA-F0-9]{64}$/.test(signature) && timingSafeEqual(Buffer.from(signature, "hex"), expected);
  });
}
