import type { Attendee } from "./attendee-types";

// Fictional UI fixtures only. Never insert these rows into Supabase or use them
// in the webhook/export routes. Ticket names, prices and dates are illustrative.
const sampleWeek = [
  { day: "Mon", date: "2026-01-05", count: 8 },
  { day: "Tue", date: "2026-01-06", count: 14 },
  { day: "Wed", date: "2026-01-07", count: 11 },
  { day: "Thu", date: "2026-01-08", count: 24 },
  { day: "Fri", date: "2026-01-09", count: 18 },
  { day: "Sat", date: "2026-01-10", count: 32 },
  { day: "Sun", date: "2026-01-11", count: 21 },
];

const ticketTypes = [
  { label: "General admission", cents: 5000, color: "var(--accent)" },
  { label: "Student", cents: 2500, color: "#6687bd" },
  { label: "Team", cents: 10000, color: "#a5b9d8" },
];
const ticketPattern = [0, 0, 1, 0, 2, 0, 1, 0];
const sampleNames = [
  "Alex Chen", "Jordan Patel", "Sam Taylor", "Riley Nguyen", "Casey Morgan",
  "Avery Singh", "Taylor Kim", "Morgan Lee", "Jamie Park", "Quinn Brooks",
];

function sampleRow(index: number, createdAt: string, status: string): Attendee {
  const ticket = ticketTypes[ticketPattern[index % ticketPattern.length]];
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `sample-row-${number}`,
    zeffy_payment_id: `sample-payment-${number}`,
    zeffy_event_id: `sample-event-${number}`,
    email: `sample.buyer${number}@example.com`,
    full_name: sampleNames[index % sampleNames.length],
    ticket_type: ticket.label,
    amount_cents: ticket.cents,
    currency: "CAD",
    status,
    paid_at: status === "succeeded" || status === "refunded" ? createdAt : null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function makeSampleAttendees(): Attendee[] {
  const rows: Attendee[] = [];
  for (const { date, count } of sampleWeek) {
    for (let sale = 0; sale < count; sale++) {
      const time = new Date(`${date}T09:00:00.000Z`);
      time.setUTCMinutes(time.getUTCMinutes() + sale * 10);
      rows.push(sampleRow(rows.length, time.toISOString(), "succeeded"));
    }
  }
  // Include different statuses so the preview has realistic table examples.
  for (const [index, status] of ["refunded", "pending", "refunded", "failed", "pending", "refunded"].entries()) {
    rows.push(sampleRow(rows.length, `2026-01-11T${18 + index}:00:00.000Z`, status));
  }
  return rows;
}

export const sampleAttendees = makeSampleAttendees();
const succeeded = sampleAttendees.filter((row) => row.status === "succeeded");
export const sampleSucceededCount = succeeded.length;

// Both charts use the same rows as the preview cards, summary and sales table.
export const sampleDailySales = sampleWeek.map(({ day, date }) => ({
  day,
  count: succeeded.filter((row) => row.paid_at?.startsWith(date)).length,
}));

export const sampleTicketMix = ticketTypes.map(({ label, color }) => ({
  label,
  color,
  count: succeeded.filter((row) => row.ticket_type === label).length,
}));
