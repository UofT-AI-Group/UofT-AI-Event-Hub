import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createOpsSession, OPS_SESSION_SECONDS, passwordMatches, verifyOpsSession, verifyZeffySignature } from "../lib/security.ts";
import { mapPayment } from "../lib/payment-mapping.ts";
import { attendeesCsv } from "../lib/csv.ts";

const now = 1_800_000_000_000;
const secret = "test-signing-secret";
const raw = Buffer.from('{ "type": "payment.completed", "note": "café" }');
function signed(body = raw, timestamp = Math.floor(now / 1000)) {
  const digest = createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

test("signature uses exact original bytes, including whitespace and UTF-8", () => {
  assert.equal(verifyZeffySignature(raw, signed(), secret, now), true);
  assert.equal(verifyZeffySignature(Buffer.from(JSON.stringify(JSON.parse(raw))), signed(), secret, now), false);
  assert.equal(verifyZeffySignature(Buffer.concat([raw, Buffer.from(" ")]), signed(), secret, now), false);
  assert.equal(verifyZeffySignature(raw, signed(), "wrong-secret", now), false);
});

test("signature rejects replay timestamps, future skew and malformed headers", () => {
  assert.equal(verifyZeffySignature(raw, signed(raw, now / 1000 - 300), secret, now), true);
  for (const offset of [-301, 301]) {
    assert.equal(verifyZeffySignature(raw, signed(raw, now / 1000 + offset), secret, now), false);
  }
  for (const header of [null, "", "t=NaN,v1=abc", "t=1800000000,v1=00", `${signed()},t=1800000000`]) {
    assert.equal(verifyZeffySignature(raw, header, secret, now), false);
  }
  assert.equal(verifyZeffySignature(raw, signed(), "", now), false);
});

test("ops cookie expires, rejects forgery and is invalidated by password rotation", () => {
  const password = "local-test-password";
  const token = createOpsSession(password, now);
  assert.equal(verifyOpsSession(token, password, now), true);
  assert.equal(token.includes(password), false);
  assert.equal(verifyOpsSession(token, password, now + OPS_SESSION_SECONDS * 1000), false);
  const forged = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
  assert.equal(verifyOpsSession(forged, password, now), false);
  assert.equal(verifyOpsSession(token, "changed-password", now), false);
  assert.equal(verifyOpsSession(undefined, password, now), false);
  assert.equal(verifyOpsSession(password, password, now), false);
  assert.equal(verifyOpsSession(token, "", now), false);
  assert.throws(() => createOpsSession("", now));
});

test("password check never allows an empty configured password", () => {
  assert.equal(passwordMatches("", ""), false);
  assert.equal(passwordMatches("different", "secret"), false);
  assert.equal(passwordMatches("secret", "secret"), true);
});

const payment = {
  id: "payment-1", amount: 5000, currency: "cad", status: "succeeded", created: 1700000000,
  buyer: { first_name: "Jane", last_name: "Doe", email: "jane@example.com" },
  items: [{ type: "ticket", rate_title: "General" }, { type: "ticket", rate_title: "General" }, { type: "additional_donation" }],
};

test("mapping keeps cents, uses webhook event ID and maps documented buyer/rate fields", () => {
  const row = mapPayment(payment, "delivery-event-1");
  assert.equal(row.zeffy_payment_id, "payment-1");
  assert.equal(row.zeffy_event_id, "delivery-event-1");
  assert.equal(row.amount_cents, 5000);
  assert.equal(row.currency, "CAD");
  assert.equal(row.ticket_type, "General");
  assert.equal(row.full_name, "Jane Doe");
  assert.equal(row.paid_at, "2023-11-14T22:13:20.000Z");
  assert.equal(mapPayment({ ...payment, refund_status: "full" }, null).status, "refunded");
});

test("mapping does not fabricate missing or invalid amounts, dates or buyer fields", () => {
  const row = mapPayment({ id: "payment-2", amount: "5000", created: Infinity }, null);
  assert.equal(row.amount_cents, null);
  assert.equal(row.paid_at, null);
  assert.equal(row.email, null);
  assert.equal(row.ticket_type, null);
  assert.equal(mapPayment({ id: "p", amount: 2147483648 }, null).amount_cents, null);
  assert.throws(() => mapPayment({}, null));
});

test("CSV quotes commas/newlines/quotes and neutralizes spreadsheet formulas", () => {
  const row = { ...mapPayment(payment, null), id: "row-1", created_at: "2026-01-01T00:00:00Z",
    full_name: 'Doe, "Jane"\nGuest', email: '=HYPERLINK("https://example.com")', ticket_type: "\tformula" };
  const csv = attendeesCsv([row]);
  assert.ok(csv.includes('"Doe, ""Jane""\nGuest"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.com"")"'));
  assert.ok(csv.includes('"\'\tformula"'));
  assert.ok(csv.includes('"5000"'));
  assert.ok(csv.endsWith("\r\n"));
  assert.equal(attendeesCsv([]).split("\r\n").length, 2);
});
