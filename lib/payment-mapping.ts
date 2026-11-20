import type { AttendeeUpsert } from "./attendee-types";

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function textField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mapPayment(payment: Record<string, unknown>, eventId: string | null): AttendeeUpsert {
  const id = textField(payment.id);
  if (!id) throw new Error("Missing payment id");
  const buyer = asRecord(payment.buyer);
  const tickets = Array.isArray(payment.items)
    ? payment.items.map(asRecord).filter((item) => item.type === "ticket") : [];
  const titles = [...new Set(tickets.map((item) => textField(item.rate_title)).filter(Boolean))];
  const amount = payment.amount;
  const created = typeof payment.created === "number" ? new Date(payment.created * 1000) : null;
  // Best effort, based on https://api.zeffy.com/api/docs; validate with a real payment.
  // amount is already cents; buyer is the purchaser, not necessarily the attendee.
  // The required schema permits ONE row per payment, so bundles/quantities cannot
  // become individual attendees. Mixed rates are grouped together for now.
  // TODO: confirm ConferenceX campaign filtering before subscribing to org-wide events.
  // TODO: confirm ticket quantities, paid time (created is a proxy), refunds/net
  // revenue and rate titles using a real completed payment + id-only update.
  return {
    zeffy_payment_id: id,
    zeffy_event_id: eventId, // Webhook event ID, never the campaign/event ID.
    email: textField(buyer.email),
    full_name: [textField(buyer.first_name), textField(buyer.last_name)].filter(Boolean).join(" ") || null,
    ticket_type: titles.length ? titles.join(" / ") : null,
    amount_cents: typeof amount === "number" && Number.isInteger(amount) && amount >= 0 && amount <= 2147483647 ? amount : null,
    currency: textField(payment.currency)?.toUpperCase() ?? null,
    status: textField(payment.refund_status) === "full" ? "refunded" : textField(payment.status),
    paid_at: created && Number.isFinite(created.getTime()) ? created.toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}
