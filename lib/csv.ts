import type { Attendee } from "./attendee-types";

const columns: (keyof Attendee)[] = [
  "id", "zeffy_payment_id", "zeffy_event_id", "email", "full_name", "ticket_type",
  "amount_cents", "currency", "status", "paid_at", "created_at", "updated_at",
];

function csvCell(value: string | number | null): string {
  let text = value == null ? "" : String(value);
  // Prevent buyer-controlled text from becoming a spreadsheet formula.
  if (typeof value === "string" && (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function attendeesCsv(rows: Attendee[]): string {
  return [columns.join(","), ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(","))].join("\r\n") + "\r\n";
}
