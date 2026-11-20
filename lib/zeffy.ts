import "server-only";
import { asRecord, textField } from "@/lib/payment-mapping";
export { verifyZeffySignature } from "@/lib/security";

export async function getZeffyPayment(id: string): Promise<Record<string, unknown>> {
  const key = process.env.ZEFFY_API_KEY;
  if (!key) throw new Error("ZEFFY_API_KEY is required to fetch a payment");
  const response = await fetch(`https://api.zeffy.com/api/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Zeffy request failed (${response.status})`);
  const payment = asRecord(await response.json());
  if (textField(payment.id) !== id) throw new Error("Unexpected payment response");
  return payment;
}
