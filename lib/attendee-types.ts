export type Attendee = {
  id: string;
  zeffy_payment_id: string;
  zeffy_event_id: string | null;
  email: string | null;
  full_name: string | null;
  ticket_type: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendeeUpsert = Omit<Attendee, "id" | "created_at">;
