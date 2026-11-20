import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import { getZeffyPayment, verifyZeffySignature } from "@/lib/zeffy";
import { asRecord, mapPayment, textField } from "@/lib/payment-mapping";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.ZEFFY_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!verifyZeffySignature(rawBody, request.headers.get("Zeffy-Signature"), secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = asRecord(JSON.parse(rawBody.toString("utf8")));
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Subscribe only to payment.completed and payment.updated in Zeffy.
  if (event.type !== "payment.completed" && event.type !== "payment.updated") {
    return Response.json({ received: true, ignored: true });
  }
  const data = asRecord(event.data);
  const paymentId = textField(data.id);
  const eventId = textField(event.id);
  if (!paymentId) return Response.json({ error: "Missing payment id" }, { status: 400 });
  if (!hasSupabaseConfig()) return Response.json({ error: "Storage is not configured" }, { status: 503 });

  try {
    const db = getSupabase();
    if (eventId) {
      const { data: existing, error } = await db.from("attendees")
        .select("zeffy_payment_id").eq("zeffy_event_id", eventId).maybeSingle();
      if (error) throw error;
      if (existing) {
        if (existing.zeffy_payment_id !== paymentId) throw new Error("Event id conflict");
        return Response.json({ received: true, duplicate: true });
      }
    }
    // Fetch current state for updates (documented id-only payload). Completed
    // events use the full data object. TODO: handle out-of-order completed
    // deliveries after updates; the exact schema stores no source version/time.
    const payment = event.type === "payment.updated" ? await getZeffyPayment(paymentId) : data;
    const row = mapPayment(payment, eventId);
    const { error } = await db.from("attendees").upsert(row, { onConflict: "zeffy_payment_id" });
    if (error) throw error;
    // zeffy_event_id is UNIQUE in SQL; the payment id is the upsert key.
    // This stores the latest event ID only, not an entire delivery history.
    return Response.json({ received: true });
  } catch {
    // Do not log buyer data or credentials. A non-2xx permits Zeffy to retry.
    console.error("Zeffy sync failed; check configuration, payload mapping and database.");
    return Response.json({ error: "Sync failed; retry delivery" }, { status: 503 });
  }
}
